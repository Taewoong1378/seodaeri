import { google } from 'googleapis';

// 서대리 마스터 템플릿 ID (실제 템플릿 시트 ID로 교체 필요)
const MASTER_TEMPLATE_ID = process.env.SEODAERI_TEMPLATE_SHEET_ID || '';

/**
 * Google Drive에서 "서대리" 관련 스프레드시트 검색
 */
export async function findSeodaeriSheet(accessToken: string): Promise<{ id: string; name: string } | null> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth });

  try {
    // "서대리" 이름이 포함된 스프레드시트 검색
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and name contains '서대리' and trashed=false",
      fields: 'files(id, name)',
      orderBy: 'modifiedTime desc',
      pageSize: 1,
    });

    const files = response.data.files;
    if (files && files.length > 0) {
      return {
        id: files[0]?.id!,
        name: files[0]?.name!,
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching for sheet:', error);
    throw error;
  }
}

/**
 * 마스터 템플릿을 복사하여 새 스프레드시트 생성
 */
export async function copyMasterTemplate(accessToken: string, userName?: string): Promise<{ id: string; name: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth });

  if (!MASTER_TEMPLATE_ID) {
    throw new Error('마스터 템플릿 ID가 설정되지 않았습니다. SEODAERI_TEMPLATE_SHEET_ID 환경변수를 확인하세요.');
  }

  try {
    const newName = `서대리 투자기록 - ${userName || '내 포트폴리오'}`;

    const response = await drive.files.copy({
      fileId: MASTER_TEMPLATE_ID,
      requestBody: {
        name: newName,
      },
    });

    return {
      id: response.data.id!,
      name: response.data.name!,
    };
  } catch (error) {
    console.error('Error copying template:', error);
    throw error;
  }
}

/**
 * 스프레드시트 데이터 읽기
 */
export async function fetchSheetData(accessToken: string, spreadsheetId: string, range: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });
    return response.data.values;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * 스프레드시트에 데이터 추가 (append)
 */
export async function appendSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error appending sheet data:', error);
    throw error;
  }
}

// Helper to parse '3. 종목현황' tab
// Assuming columns: A=Name, B=Country, C=Ticker, ..., G=CurrentPrice, H=TotalValue, J=Yield
export function parsePortfolioData(rows: any[]) {
  // Skip header row
  return rows.slice(1).map((row) => {
    const ticker = row[2]; // C column
    if (!ticker) return null;

    return {
      ticker,
      name: row[0], // A column
      currentPrice: Number.parseFloat(row[6]?.replace(/,/g, '') || '0'), // G column
      quantity: Number.parseFloat(row[4]?.replace(/,/g, '') || '0'), // E column
      avgPrice: Number.parseFloat(row[5]?.replace(/,/g, '') || '0'), // F column
      currency: row[1] === '한국' ? 'KRW' : 'USD', // B column (Country)
    };
  }).filter(Boolean);
}
