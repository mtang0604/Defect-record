import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import handler from './api/reports.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes - Proxy to the handler
app.all('/api/reports', async (req, res) => {
  // Ensure query parameters are passed through
  await handler(req, res);
});

// Keep this for backward compatibility or if needed, but the handler now expects query params
app.all('/api/reports/:rowIndex', async (req, res) => {
  req.query = { ...req.query, rowIndex: req.params.rowIndex };
  await handler(req, res);
});

async function startServer() {
  // Note: ensureHeaders was removed from exports to comply with Vercel's default export rule.
  // If you need it on startup, you can call the handler with a special internal method or re-export it.

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
