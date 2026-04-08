import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1y5w9x7E02xb3Otni11iN9YHmsT_Fk1ynyN52RmmwMOc';
const RANGE = `A:K`;

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

export default async function handler(req: any, res: any) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const activeReports = await getReports();
      return res.status(200).json(activeReports);
    } 
    
    if (method === 'POST') {
      await addReport(req.body);
      return res.status(200).json({ success: true });
    }

    if (method === 'PUT') {
      const rowIndex = req.query.rowIndex || req.body.rowIndex;
      console.log('PUT Request - rowIndex:', rowIndex, 'body:', req.body);
      if (!rowIndex) {
        return res.status(400).json({ error: 'Missing rowIndex' });
      }
      await updateReportStatus(rowIndex as string, req.body);
      return res.status(200).json({ success: true });
    }

    if (method === 'DELETE') {
      const rowIndex = req.query.rowIndex;
      if (!rowIndex) {
        return res.status(400).json({ error: 'Missing rowIndex' });
      }
      await deleteReport(rowIndex as string);
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getReports() {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: RANGE,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    return [];
  }

  const data = rows.slice(1)
    .map((row, index) => {
      return {
        rowIndex: index + 2,
        date: row[0] || '',
        reporter: row[1] || '',
        itemNumber: row[2] || '',
        quantity: row[3] || '',
        reason: row[4] || '',
        status: row[5] || '待處理',
        updater: row[6] || '',
        updateDate: row[7] || '',
        vendor: row[8] || '',
        completionDate: row[9] || '',
        photo: row[10] || '',
        _isEmpty: row.length === 0 || !row.some(cell => cell && cell.trim() !== '')
      };
    })
    .filter(report => !report._isEmpty);

  return data.filter(report => report.status.trim() !== '完成' && report.status.trim() !== '已刪除');
}

async function addReport(reportData: any) {
  const { date, reporter, itemNumber, quantity, reason, photo } = reportData;
  const sheets = await getSheetsClient();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[date, reporter, itemNumber, quantity, reason, '待處理', '', '', '', '', photo || '']],
    },
  });
}

export async function deleteReport(rowIndex: string) {
  const sheets = await getSheetsClient();
  // We'll just clear the row. Our filter in getReports will ignore it.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `A${rowIndex}:K${rowIndex}`,
  });
}

async function updateReportStatus(rowIndex: string, updateData: any) {
  const { status, updater, updateDate, vendor, completionDate } = updateData;
  const sheets = await getSheetsClient();

  // Get current row to preserve existing data in I:J if not provided
  const currentData = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `I${rowIndex}:J${rowIndex}`,
  });
  
  const currentVendor = currentData.data.values?.[0]?.[0] || '';
  const currentCompletionDate = currentData.data.values?.[0]?.[1] || '';

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `F${rowIndex}:J${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        status, 
        updater, 
        updateDate, 
        vendor !== undefined ? vendor : currentVendor, 
        completionDate !== undefined ? completionDate : currentCompletionDate
      ]],
    },
  });
}

async function ensureHeaders() {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `A1:K1`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `A1:K1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['發生日期', '回報人員', '品號', '數量', '原因說明', '狀態', '更新人員', '更新日期', '廠商', '完成日期', '照片']],
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring headers:', error);
  }
}
