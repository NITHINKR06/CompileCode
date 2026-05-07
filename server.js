import express from 'express';

const app = express();
const PORT = 3002;

app.use(express.text());
app.use(express.json());

app.post('/api/execute', async (req, res) => {
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    console.log('Execute request:', JSON.stringify(payload, null, 2));
    
    // Try primary endpoint first
    let response = await fetch('https://api.piston.rocks/execute', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'CodeRun/1.0',
      },
      body: JSON.stringify(payload),
    });

    // Fallback to emkc.org if primary fails
    if (response.status === 401 || response.status === 404) {
      console.log('Trying fallback endpoint...');
      response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'CodeRun/1.0',
        },
        body: JSON.stringify(payload),
      });
    }

    const responseText = await response.text();
    console.log(`API Response (${response.status}):`, responseText);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        message: `Piston API error: ${response.status}`,
        error: responseText 
      });
    }

    const data = JSON.parse(responseText);
    res.status(200).json(data);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✓ Backend ready to proxy to Piston API`);
});
