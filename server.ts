import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1y5w9x7E02xb3Otni11iN9YHmsT_Fk1ynyN52RmmwMOc';
const RANGE = `A:H`;

// Helper to get Google Sheets client
async function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Missing Google Service Account credentials in environment variables.');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

// Ensure headers exist
async function ensureHeaders() {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `A1:H1`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['發生日期', '回報人員', '品號', '數量', '原因說明', '狀態', '更新人員', '更新日期']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring headers:', error);
  }
}

// API Routes
app.get('/api/reports', async (req, res) => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row, index) => {
      return {
        rowIndex: index + 2, // +2 because 0-indexed and header is row 1
        date: row[0] || '',
        reporter: row[1] || '',
        itemNumber: row[2] || '',
        quantity: row[3] || '',
        reason: row[4] || '',
        status: row[5] || '待處理',
        updater: row[6] || '',
        updateDate: row[7] || '',
      };
    });

    // Filter out '完成'
    const activeReports = data.filter(report => report.status !== '完成');
    res.json(activeReports);
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { date, reporter, itemNumber, quantity, reason } = req.body;
    const sheets = await getSheetsClient();
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, reporter, itemNumber, quantity, reason, '待處理', '', '']],
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error adding report:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reports/:rowIndex', async (req, res) => {
  try {
    const { rowIndex } = req.params;
    const { status, updater, updateDate } = req.body;
    const sheets = await getSheetsClient();

    // Update only the status, updater, and updateDate columns (F, G, H)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `F${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status, updater, updateDate]],
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Try to ensure headers on startup, but don't crash if it fails (e.g., no credentials yet)
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
