export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const payload = JSON.parse(body);

    const judge0Payload = {
      language_id: payload.language_id,
      source_code: payload.source_code,
      stdin: payload.stdin || '',
    };

    // Fix #12: Add a 20s timeout on Judge0 calls (was missing entirely)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let response;
    try {
      response = await fetch('https://judge0-ce.com/api/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'CodeRunner/1.0' },
        body: JSON.stringify(judge0Payload),
        signal: controller.signal,
      });
    } catch {
      // Fallback endpoint
      response = await fetch('https://api.judge0.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'CodeRunner/1.0' },
        body: JSON.stringify(judge0Payload),
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);

    // Fix #5: Check response.ok BEFORE calling response.json()
    // Previously, json() was called first — if the error body wasn't valid JSON it would crash
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ message: `API error: ${response.status}`, error: text });
    }

    const data = await response.json();

    res.status(200).json({
      run: {
        stdout: (data.stdout || '').trim(),
        stderr: (data.stderr || data.compile_output || '').trim(),
        code: data.status?.id === 3 ? 0 : (data.status?.id || -1),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
