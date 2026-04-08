import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1y5w9x7E02xb3Otni11iN9YHmsT_Fk1ynyN52RmmwMOc';
const RANGE = `A:H`;

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

export const getReports = async () => {
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
        _isEmpty: row.length === 0 || !row.some(cell => cell && cell.trim() !== '')
      };
    })
    .filter(report => !report._isEmpty);

  return data.filter(report => report.status.trim() !== '完成');
};

export const addReport = async (reportData: any) => {
  const { date, reporter, itemNumber, quantity, reason } = reportData;
  const sheets = await getSheetsClient();
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: RANGE,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[date, reporter, itemNumber, quantity, reason, '待處理', '', '']],
    },
  });
};

export const updateReportStatus = async (rowIndex: string, updateData: any) => {
  const { status, updater, updateDate } = updateData;
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `F${rowIndex}:H${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[status, updater, updateDate]],
    },
  });
};

export const ensureHeaders = async () => {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `A1:H1`,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
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
};
