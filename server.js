import express from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = 3002;

// Fix #11: CORS middleware so frontend on different origin can reach this server
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.text());
app.use(express.json());

// NOTE Fix #4: For production replace this with sandboxed Docker/VM execution.
// Running arbitrary user code directly on the server is a security risk.
async function executeLocally(language, sourceCode, stdin) {
  return new Promise((resolve) => {
    let cmd, args;

    // Fix #6: Normalise to string so both numeric (71/63) and string ('python'/'javascript') IDs work
    const lang = String(language).toLowerCase();

    if (lang === 'python' || lang === '71') {
      cmd = 'python3';
      args = ['-c', sourceCode];
    } else if (lang === 'javascript' || lang === '63') {
      cmd = 'node';
      args = ['-e', sourceCode];
    } else {
      return resolve(null);
    }

    try {
      const proc = spawn(cmd, args);
      let stdout = '';
      let stderr = '';

      // Fix #3: spawn() ignores the `timeout` option — use a manual kill timer
      const killTimer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve({
          stdout: stdout.trim(),
          stderr: 'Error: Execution timed out after 5 seconds',
          code: 1,
        });
      }, 5000);

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        clearTimeout(killTimer);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 0 });
      });

      proc.on('error', (err) => {
        clearTimeout(killTimer);
        resolve({ stdout: '', stderr: `Error: ${err.message}`, code: 1 });
      });

      if (stdin) proc.stdin.write(stdin);
      proc.stdin.end();
    } catch (err) {
      resolve({ stdout: '', stderr: `Execution error: ${err.message}`, code: 1 });
    }
  });
}

async function executeWithJudge0(judge0Payload) {
  try {
    console.log('Attempting Judge0 execution with language_id:', judge0Payload.language_id);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://judge0-ce.com/api/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'CodeRunner/1.0' },
      body: JSON.stringify(judge0Payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Fix #1 (server-side): Check ok BEFORE parsing body to avoid JSON parse crash on error pages
    if (!response.ok) {
      const text = await response.text();
      console.warn(`Judge0 non-OK status: ${response.status}`, text);
      throw new Error(`Judge0 API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Judge0 execution completed');

    return {
      stdout: (data.stdout || '').trim(),
      stderr: (data.stderr || data.compile_output || '').trim(),
      code: data.status?.id === 3 ? 0 : (data.status?.id || -1),
    };
  } catch (err) {
    console.error('Judge0 execution failed:', err.message);
    throw err;
  }
}

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/api/test', async (req, res) => {
  console.log('\n=== Testing execution environment ===');
  try {
    const localResult = await executeLocally('python', 'print("Hello from local Python")', '');
    if (localResult) {
      return res.status(200).json({ type: 'local', message: 'Local Python execution available', testOutput: localResult.stdout, result: localResult });
    }
    console.log('Testing Judge0...');
    const judge0Result = await executeWithJudge0({ language_id: 71, source_code: 'print("Hello from Judge0")' });
    return res.status(200).json({ type: 'judge0', message: 'Judge0 execution available', testOutput: judge0Result.stdout, result: judge0Result });
  } catch (err) {
    res.status(500).json({ error: err.message, message: 'No execution method available' });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log(`Execute request: lang=${payload.language_id}`);

    if (!payload.language_id || !payload.source_code) {
      return res.status(400).json({ message: 'Missing required fields: language_id and source_code' });
    }

    const localResult = await executeLocally(payload.language_id, payload.source_code, payload.stdin);
    if (localResult) {
      console.log('Local execution succeeded');
      return res.status(200).json({ run: localResult });
    }

    const result = await executeWithJudge0({
      language_id: payload.language_id,
      source_code: payload.source_code,
      stdin: payload.stdin || '',
    });

    res.status(200).json({ run: { stdout: result.stdout, stderr: result.stderr, code: result.code } });
  } catch (err) {
    console.error('Execution error:', err.message);
    res.status(500).json({ message: 'Error executing code', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`✓ Local Python/Node.js execution available`);
  console.log(`✓ Judge0 API available as fallback\n`);
});
