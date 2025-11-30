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

/**
 * 스프레드시트의 특정 셀 값 업데이트
 */
export async function updateSheetCell(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  value: string | number
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error updating sheet cell:', error);
    throw error;
  }
}

/**
 * 스프레드시트의 여러 셀 한번에 업데이트
 */
export async function batchUpdateSheet(
  accessToken: string,
  spreadsheetId: string,
  data: { range: string; values: any[][] }[]
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const sheets = google.sheets({ version: 'v4', auth });

  try {
    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error batch updating sheet:', error);
    throw error;
  }
}

// ============================================
// 시트 탭별 데이터 파싱 헬퍼 함수들
// ============================================

/**
 * '1. 계좌현황(누적)' 탭에서 총자산, 수익률 등 대시보드 데이터 파싱
 * G5: 총자산(원화 환산), G8: 수익률
 */
export interface AccountSummary {
  totalAsset: number;       // 총 자산 (원화)
  totalYield: number;       // 총 수익률 (%)
  totalInvested: number;    // 총 투자원금
  totalProfit: number;      // 총 수익금
}

export function parseAccountSummary(rows: any[]): AccountSummary {
  const parseNumber = (val: any): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[₩$,%\s,]/g, '');
    return Number.parseFloat(cleaned) || 0;
  };

  // 라벨을 찾아서 해당 값을 추출하는 헬퍼 함수
  const findValueByLabel = (labels: string[]): number => {
    for (const row of rows) {
      if (!row || !Array.isArray(row)) continue;
      for (let i = 0; i < row.length; i++) {
        const cell = String(row[i] || '').trim();
        if (labels.some(label => cell.includes(label))) {
          // 라벨 다음 셀에서 값을 찾음
          for (let j = i + 1; j < row.length; j++) {
            const val = parseNumber(row[j]);
            if (val !== 0) return val;
          }
        }
      }
    }
    return 0;
  };

  // 다양한 라벨 패턴으로 검색
  const totalAsset = findValueByLabel(['총자산', '총 자산', '평가금액', '평가액']);
  const totalYield = findValueByLabel(['누적 수익률', '수익률', '총수익률']);
  const totalInvested = findValueByLabel(['투자원금', '투자금액', '원금', '매입금액']);
  const totalProfit = findValueByLabel(['수익금', '평가손익', '손익']);

  console.log('[parseAccountSummary] Parsed values:', { totalAsset, totalYield, totalInvested, totalProfit });

  return {
    totalAsset,
    totalYield,
    totalInvested,
    totalProfit,
  };
}

/**
 * '7. 배당내역' 탭에서 배당금 데이터 파싱
 * 가정: A=날짜, B=종목코드, C=종목명, D=배당금(원화), E=배당금(달러)
 */
export interface DividendRecord {
  date: string;
  ticker: string;
  name: string;
  amountKRW: number;
  amountUSD: number;
}

export function parseDividendData(rows: any[]): DividendRecord[] {
  if (!rows || rows.length <= 1) return [];

  const parseNumber = (val: any): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[₩$,\s]/g, '');
    return Number.parseFloat(cleaned) || 0;
  };

  // Skip header row
  return rows.slice(1).map((row) => {
    if (!row[0]) return null; // 날짜 없으면 skip

    return {
      date: String(row[0] || ''),
      ticker: String(row[1] || ''),
      name: String(row[2] || ''),
      amountKRW: parseNumber(row[3]),
      amountUSD: parseNumber(row[4]),
    };
  }).filter((item): item is DividendRecord => item !== null);
}

/**
 * 월별 배당금 집계
 */
export interface MonthlyDividend {
  month: string;
  year: number;
  amount: number;
}

export function aggregateMonthlyDividends(dividends: DividendRecord[]): MonthlyDividend[] {
  const monthlyMap = new Map<string, number>();
  const exchangeRate = 1400; // USD to KRW (시트에서 읽어오는 것이 이상적)

  for (const d of dividends) {
    const date = new Date(d.date);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month.toString().padStart(2, '0')}`;

    const amountKRW = d.amountKRW + (d.amountUSD * exchangeRate);
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + amountKRW);
  }

  // 최근 6개월 데이터 반환
  const sorted = Array.from(monthlyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6)
    .reverse();

  return sorted.map(([key, amount]) => {
    const parts = key.split('-');
    const year = parts[0] || '2024';
    const month = parts[1] || '1';
    return {
      month: `${Number.parseInt(month)}월`,
      year: Number.parseInt(year),
      amount: Math.round(amount),
    };
  });
}

// Helper to parse '3. 종목현황' tab
// Assuming columns: A=Name, B=Country, C=Ticker, D=통화, E=수량, F=평단가, G=현재가, H=평가액, I=수익금, J=수익률
export interface PortfolioItem {
  ticker: string;
  name: string;
  country: string;
  currency: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  yieldPercent: number;
  rowIndex: number; // 시트 행 번호 (업데이트용)
}

export function parsePortfolioData(rows: any[]): PortfolioItem[] {
  if (!rows || rows.length <= 1) return [];

  const parseNumber = (val: any): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[₩$,%\s,]/g, '');
    return Number.parseFloat(cleaned) || 0;
  };

  // Skip header row
  return rows.slice(1).map((row, index) => {
    const ticker = row[2]; // C column
    if (!ticker) return null;

    return {
      ticker: String(ticker),
      name: String(row[0] || ''), // A column
      country: String(row[1] || ''), // B column
      currency: row[1] === '한국' ? 'KRW' : 'USD',
      quantity: parseNumber(row[4]), // E column
      avgPrice: parseNumber(row[5]), // F column
      currentPrice: parseNumber(row[6]), // G column
      totalValue: parseNumber(row[7]), // H column
      profit: parseNumber(row[8]), // I column
      yieldPercent: parseNumber(row[9]), // J column
      rowIndex: index + 2, // 실제 시트 행 번호 (1-indexed, 헤더 제외)
    };
  }).filter((item): item is PortfolioItem => item !== null);
}

/**
 * 매매 발생 시 평단가 계산 (이동평균법)
 * 매수: New평단가 = (기존수량 * 기존평단가 + 매수수량 * 매수가) / (기존수량 + 매수수량)
 * 매도: 평단가 유지, 수량만 차감
 */
export function calculateNewAvgPrice(
  currentQty: number,
  currentAvgPrice: number,
  tradeQty: number,
  tradePrice: number,
  tradeType: 'BUY' | 'SELL'
): { newQty: number; newAvgPrice: number } {
  if (tradeType === 'BUY') {
    const totalCost = (currentQty * currentAvgPrice) + (tradeQty * tradePrice);
    const newQty = currentQty + tradeQty;
    const newAvgPrice = newQty > 0 ? totalCost / newQty : 0;
    return { newQty, newAvgPrice: Math.round(newAvgPrice * 100) / 100 };
  }

  // SELL
  const newQty = Math.max(0, currentQty - tradeQty);
  return { newQty, newAvgPrice: currentAvgPrice }; // 평단가 유지
}
