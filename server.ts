import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { getReports, addReport, updateReportStatus, ensureHeaders } from './api/reports.ts';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/reports', async (req, res) => {
  try {
    const activeReports = await getReports();
    res.json(activeReports);
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    await addReport(req.body);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error adding report:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reports/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    await updateReportStatus(rowIndex, req.body);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Try to ensure headers on startup
  ensureHeaders().catch(console.error);

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
