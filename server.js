import express from 'express';
import { spawn } from 'child_process';

const app = express();
const PORT = 3002;

app.use(express.text());
app.use(express.json());

// Local execution handler for simple cases
async function executeLocally(language, sourceCode, stdin) {
  return new Promise((resolve) => {
    let cmd, args;
    
    if (language === 'python' || language === 71) {
      cmd = 'python3';
      args = ['-c', sourceCode];
    } else if (language === 'javascript' || language === 63) {
      cmd = 'node';
      args = ['-e', sourceCode];
    } else {
      // Not supported locally
      return resolve(null);
    }
    
    try {
      const proc = spawn(cmd, args, { timeout: 5000 });
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });
      
      proc.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          code: code || 0
        });
      });
      
      proc.on('error', (err) => {
        resolve({
          stdout: '',
          stderr: `Error: ${err.message}`,
          code: 1
        });
      });
      
      // Send stdin if provided
      if (stdin) {
        proc.stdin.write(stdin);
        proc.stdin.end();
      } else {
        proc.stdin.end();
      }
    } catch (err) {
      resolve({
        stdout: '',
        stderr: `Execution error: ${err.message}`,
        code: 1
      });
    }
  });
}

async function executeWithJudge0(judge0Payload) {
  try {
    console.log('Attempting Judge0 execution with language_id:', judge0Payload.language_id);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    
    const response = await fetch('https://judge0-ce.com/api/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'CodeRunner/1.0',
      },
      body: JSON.stringify(judge0Payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log(`Judge0 Response Status: ${response.status}`);
    
    if (!response.ok) {
      console.warn(`Judge0 returned non-OK status: ${response.status}`);
      throw new Error(`Judge0 API error: ${response.status}`);
    }

    const data = JSON.parse(responseText);
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
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', async (req, res) => {
  console.log('\n=== Testing execution environment ===');
  
  try {
    // Test local Python
    const localResult = await executeLocally('python', 'print("Hello from local Python")', '');
    
    if (localResult) {
      return res.status(200).json({
        type: 'local',
        message: 'Local Python execution available',
        testOutput: localResult.stdout,
        result: localResult
      });
    }
    
    // If local doesn't work, test Judge0
    console.log('Testing Judge0...');
    const judge0Result = await executeWithJudge0({
      language_id: 71,
      source_code: 'print("Hello from Judge0")',
    });
    
    return res.status(200).json({
      type: 'judge0',
      message: 'Judge0 execution available',
      testOutput: judge0Result.stdout,
      result: judge0Result
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      message: 'No execution method available'
    });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log(`Execute request: lang=${payload.language_id}`);
    
    if (!payload.language_id || !payload.source_code) {
      return res.status(400).json({
        message: 'Missing required fields: language_id and source_code',
      });
    }
    
    // Try local execution first
    const localResult = await executeLocally(payload.language_id, payload.source_code, payload.stdin);
    
    if (localResult) {
      console.log('Local execution succeeded');
      return res.status(200).json({
        run: localResult
      });
    }
    
    // Fall back to Judge0
    const judge0Payload = {
      language_id: payload.language_id,
      source_code: payload.source_code,
      stdin: payload.stdin || '',
    };
    
    const result = await executeWithJudge0(judge0Payload);
    
    res.status(200).json({
      run: {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      }
    });
    
  } catch (err) {
    console.error('Execution error:', err.message);
    
    res.status(500).json({ 
      message: 'Error executing code',
      error: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`✓ Local Python/Node.js execution available`);
  console.log(`✓ Judge0 API available as fallback\n`);
});
