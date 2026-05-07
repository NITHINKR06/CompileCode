import express from 'express';
import { createProxyMiddleware } from 'express-http-proxy';

const app = express();
const PORT = 3001;
const VITE_PORT = 5173;

app.use(express.text());
app.use(express.json());

app.post('/api/execute', async (req, res) => {
  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy all other requests to Vite dev server
app.use('/', createProxyMiddleware({
  target: `http://localhost:${VITE_PORT}`,
  changeOrigin: true,
}));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Proxying to Vite dev server on http://localhost:${VITE_PORT}`);
});
