import { google } from 'googleapis';

export default async function handler(req, res) {
  // 1. 處理跨網域問題 (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. 讀取環境變數 (這就是你在 Vercel 設定的那三把鑰匙)
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    if (req.method === 'GET') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A:H', // 請確保你的分頁名稱是 Sheet1
      });
      return res.status(200).json(response.data.values || []);
    }

    if (req.method === 'POST') {
      const { date, reporter, itemNumber, quantity, reason } = req.body;
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[date, reporter, itemNumber, quantity, reason, '待處理']],
        },
      });
      return res.status(200).json({ success: true });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
