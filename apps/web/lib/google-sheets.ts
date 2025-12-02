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
 * 월별 손익 데이터 타입
 */
export interface MonthlyProfitLoss {
  month: string; // "1월", "2월", ...
  profit: number; // 수익 (양수일 때)
  loss: number; // 손실 (음수일 때의 절대값)
}

/**
 * '2. 계좌현황(올해)' 시트의 월별 손익 데이터 파싱
 * 범위: B48:M50
 * - B48:M48 = 연도 (2025)
 * - B49:M49 = 월 라벨 (1월~12월)
 * - B50:M50 = 순손익 값 (양수=수익, 음수=손실)
 */
export function parseMonthlyProfitLoss(rows: any[]): MonthlyProfitLoss[] {
  console.log('[parseMonthlyProfitLoss] Input rows:', JSON.stringify(rows));

  if (!rows || rows.length === 0) return [];

  const parseNumber = (val: any): number => {
    if (!val || val === '-') return 0;
    const str = String(val);

    // 음수 표현 감지: ▼, 괄호(), 또는 - 기호
    let isNegative = false;
    if (str.includes('▼') || str.includes('▽') || /^\(.*\)$/.test(str.trim())) {
      isNegative = true;
    }

    // 숫자만 추출 (쉼표, 통화기호, 특수문자 제거)
    const cleaned = str.replace(/[₩$,%\s▼▽()]/g, '').replace(/,/g, '');
    let num = Number.parseFloat(cleaned) || 0;

    // 음수 처리 (원래 음수 부호가 있거나 특수 표현이 있는 경우)
    if (isNegative && num > 0) {
      num = -num;
    }

    console.log(`[parseNumber] Input: "${val}" -> Output: ${num}`);
    return num;
  };

  const results: MonthlyProfitLoss[] = [];

  // 3행 구조: rows[0]=연도, rows[1]=월라벨, rows[2]=손익데이터
  // 2행 구조: rows[0]=월라벨, rows[1]=손익데이터
  let labelRow: any[];
  let dataRow: any[];

  if (rows.length >= 3) {
    // 3행 구조 (연도, 월라벨, 데이터)
    labelRow = rows[1] || [];
    dataRow = rows[2] || [];
  } else if (rows.length === 2) {
    // 2행 구조 (월라벨, 데이터)
    labelRow = rows[0] || [];
    dataRow = rows[1] || [];
  } else {
    // 1행만 있는 경우
    labelRow = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    dataRow = rows[0] || [];
  }

  console.log('[parseMonthlyProfitLoss] Label row:', JSON.stringify(labelRow));
  console.log('[parseMonthlyProfitLoss] Data row:', JSON.stringify(dataRow));

  for (let i = 0; i < 12; i++) {
    const netValue = parseNumber(dataRow[i]);
    const month = String(labelRow[i] || `${i + 1}월`);

    results.push({
      month,
      profit: netValue > 0 ? netValue : 0,
      loss: netValue < 0 ? Math.abs(netValue) : 0,
    });
  }

  console.log('[parseMonthlyProfitLoss] Parsed results:', JSON.stringify(results));
  return results;
}

/**
 * '7. 배당내역' 탭에서 배당금 데이터 파싱
 * 시트 구조가 다를 수 있으므로 유연하게 처리
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

  // 날짜 형식 감지 (YYYY/MM/DD, YYYY-MM-DD, MM/DD/YYYY 등)
  const parseDate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();

    // YYYY/MM/DD 또는 YYYY-MM-DD 형식
    const match1 = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (match1) {
      return `${match1[1]}-${match1[2]?.padStart(2, '0')}-${match1[3]?.padStart(2, '0')}`;
    }

    // MM/DD/YYYY 형식
    const match2 = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match2) {
      return `${match2[3]}-${match2[1]?.padStart(2, '0')}-${match2[2]?.padStart(2, '0')}`;
    }

    return null;
  };

  // 헤더 행을 분석하여 컬럼 인덱스 찾기
  const headerRow = rows[0] || [];
  let dateCol = -1;
  let tickerCol = -1;
  let nameCol = -1;
  let amountKRWCol = -1;
  let amountUSDCol = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] || '').toLowerCase();
    if (header.includes('날짜') || header.includes('date') || header.includes('일자')) {
      dateCol = i;
    } else if (header.includes('종목코드') || header.includes('ticker') || header.includes('코드')) {
      tickerCol = i;
    } else if (header.includes('종목명') || header.includes('name') || header.includes('종목')) {
      nameCol = i;
    } else if (header.includes('원화') || header.includes('krw') || header.includes('배당금')) {
      if (amountKRWCol === -1) amountKRWCol = i;
    } else if (header.includes('달러') || header.includes('usd') || header.includes('$')) {
      amountUSDCol = i;
    }
  }

  // 헤더를 찾지 못한 경우 기본값 사용
  if (dateCol === -1) dateCol = 1; // B열
  if (tickerCol === -1) tickerCol = 5; // F열
  if (nameCol === -1) nameCol = 6; // G열
  if (amountKRWCol === -1) amountKRWCol = 7; // H열
  if (amountUSDCol === -1) amountUSDCol = 8; // I열

  console.log('[parseDividendData] Column indices:', { dateCol, tickerCol, nameCol, amountKRWCol, amountUSDCol });

  const results: DividendRecord[] = [];

  // 데이터 행 파싱 (헤더 제외)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    // 날짜 찾기 - 여러 컬럼 시도
    let date: string | null = null;
    for (let col = 0; col < Math.min(row.length, 5); col++) {
      date = parseDate(row[col]);
      if (date) break;
    }

    if (!date) continue; // 유효한 날짜 없으면 skip

    // 배당금 찾기 - 숫자 값이 있는 컬럼 탐색
    let amountKRW = parseNumber(row[amountKRWCol]);
    let amountUSD = parseNumber(row[amountUSDCol]);

    // 배당금이 0이면 다른 컬럼에서 찾기
    if (amountKRW === 0 && amountUSD === 0) {
      for (let col = 5; col < row.length; col++) {
        const val = parseNumber(row[col]);
        if (val > 0) {
          // USD인지 KRW인지 추정 (금액 크기로)
          if (val > 1000) {
            amountKRW = val;
          } else {
            amountUSD = val;
          }
          break;
        }
      }
    }

    // 배당금이 하나라도 있으면 기록
    if (amountKRW > 0 || amountUSD > 0) {
      results.push({
        date,
        ticker: String(row[tickerCol] || ''),
        name: String(row[nameCol] || ''),
        amountKRW,
        amountUSD,
      });
    }
  }

  console.log('[parseDividendData] Parsed records count:', results.length);
  if (results.length > 0) {
    console.log('[parseDividendData] First 3 records:', results.slice(0, 3));
  }

  return results;
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
  const monthlyMap = new Map<string, { year: number; month: number; amount: number }>();
  const exchangeRate = 1400; // USD to KRW (시트에서 읽어오는 것이 이상적)

  for (const d of dividends) {
    const date = new Date(d.date);
    if (Number.isNaN(date.getTime())) continue;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${month.toString().padStart(2, '0')}`;

    const amountKRW = d.amountKRW + (d.amountUSD * exchangeRate);
    const existing = monthlyMap.get(key);
    if (existing) {
      existing.amount += amountKRW;
    } else {
      monthlyMap.set(key, { year, month, amount: amountKRW });
    }
  }

  // 모든 월별 데이터를 배열로 변환하고 정렬 (연도, 월 순)
  const results: MonthlyDividend[] = Array.from(monthlyMap.values())
    .map(({ year, month, amount }) => ({
      month: `${month}월`,
      year,
      amount: Math.round(amount),
    }))
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return Number.parseInt(a.month) - Number.parseInt(b.month);
    });

  return results;
}

// Helper to parse '3. 종목현황' tab
// 실제 시트 구조: [empty, index, 국가, 종목코드, 종목명, 수량, 평단가(원), 평단가($), 현재가(원), 현재가($), 평가액, 투자비중, ...]
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
  weight: number; // 시트의 투자비중
  rowIndex: number; // 시트 행 번호 (업데이트용)
}

export function parsePortfolioData(rows: any[]): PortfolioItem[] {
  if (!rows || rows.length <= 1) return [];

  const parseNumber = (val: any): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[₩$,%\s,]/g, '');
    return Number.parseFloat(cleaned) || 0;
  };

  const results: PortfolioItem[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    // 종목코드/종목명 확인
    const ticker = String(row[3] || '').trim();
    const name = String(row[4] || '').trim();

    // 헤더 행 제외
    if (!ticker || ticker.includes('종목') || ticker.includes('티커')) continue;

    // 빈 행 제외 (종목명도 없는 경우)
    if (!name) continue;

    const country = String(row[2] || '').trim();
    const quantity = parseNumber(row[5]);
    const avgPrice = parseNumber(row[6]); // 원화 평단가
    const currentPrice = parseNumber(row[8]); // 원화 현재가

    // 평가액: 시트에서 직접 가져오거나 계산
    let totalValue = parseNumber(row[10]); // 평가액 [원화] 컬럼 (K열, index 10)
    if (totalValue === 0 && currentPrice > 0 && quantity > 0) {
      totalValue = currentPrice * quantity;
    }

    // 평가액이 0이면 skip (빈 행)
    if (totalValue === 0) continue;

    // 투자비중: 시트에서 직접 가져옴 (%)
    const weight = parseNumber(row[11]); // 투자비중 컬럼 (L열, index 11)

    const invested = avgPrice * quantity;
    const profit = totalValue - invested;
    const yieldPercent = invested > 0 ? (profit / invested) * 100 : 0;

    results.push({
      ticker,
      name,
      country,
      currency: country === '한국' ? 'KRW' : 'USD',
      quantity,
      avgPrice,
      currentPrice,
      totalValue,
      profit,
      yieldPercent,
      weight,
      rowIndex: i + 1,
    });
  }

  console.log('[parsePortfolioData] Parsed items:', results.length);
  if (results.length > 0) {
    console.log('[parsePortfolioData] First 3 items:', JSON.stringify(results.slice(0, 3)));
  }

  return results;
}

/**
 * '6. 입금내역' 탭에서 입금/출금 데이터 파싱
 */
export interface DepositRecord {
  date: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  memo: string;
  account: string; // 계좌(증권사) 정보
}

/**
 * 계좌 목록 가져오기
 * "6. 입금내역" 시트의 E열 (계좌구분) 데이터 검증 목록 또는
 * 별도의 계좌 목록 시트에서 가져옴
 */
export function parseAccountList(rows: any[]): string[] {
  if (!rows || rows.length === 0) return [];

  const accounts: Set<string> = new Set();

  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue;
    // 첫 번째 컬럼에서 계좌명 추출
    const accountName = String(row[0] || '').trim();
    if (accountName && !accountName.includes('계좌') && accountName !== '구분') {
      accounts.add(accountName);
    }
  }

  // Set을 배열로 변환
  const result = Array.from(accounts);
  console.log('[parseAccountList] Parsed accounts:', result);
  return result;
}

/**
 * 입금내역에서 사용된 계좌 목록 추출
 */
export function extractAccountsFromDeposits(rows: any[]): string[] {
  if (!rows || rows.length <= 1) return [];

  const accounts: Set<string> = new Set();

  // E열(index 4)이 계좌 컬럼으로 추정
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    // 여러 컬럼에서 계좌 찾기 (보통 4~5번째 컬럼)
    for (let col = 3; col <= 5; col++) {
      const cellValue = String(row[col] || '').trim();
      // 계좌명처럼 보이는 값 (일반계좌, 개인연금, IRP 등)
      if (cellValue &&
          (cellValue.includes('계좌') ||
           cellValue.includes('연금') ||
           cellValue.includes('IRP') ||
           cellValue.includes('ISA') ||
           cellValue.includes('DC'))) {
        accounts.add(cellValue);
      }
    }
  }

  const result = Array.from(accounts);
  console.log('[extractAccountsFromDeposits] Extracted accounts:', result);
  return result;
}

export function parseDepositData(rows: any[]): DepositRecord[] {
  if (!rows || rows.length <= 1) return [];

  const parseNumber = (val: any): number => {
    if (!val) return 0;
    // - 기호도 제거하고 절대값으로 반환
    const cleaned = String(val).replace(/[₩$,\s-]/g, '');
    return Number.parseFloat(cleaned) || 0;
  };

  const isNegativeAmount = (val: any): boolean => {
    if (!val) return false;
    const str = String(val);
    return str.includes('-') || str.startsWith('-');
  };

  const parseDate = (val: any): string | null => {
    if (!val) return null;
    const str = String(val).trim();

    // YYYY/MM/DD 또는 YYYY-MM-DD 형식
    const match1 = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (match1) {
      return `${match1[1]}-${match1[2]?.padStart(2, '0')}-${match1[3]?.padStart(2, '0')}`;
    }

    return null;
  };

  const results: DepositRecord[] = [];

  // 헤더 행 분석
  const headerRow = rows[0] || [];
  let dateCol = -1;
  let accountCol = -1; // 계좌(증권사) 컬럼
  let typeCol = -1; // 구분 컬럼 (입금/출금)
  let amountCol = -1;
  let memoCol = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] || '').toLowerCase();
    if (header.includes('날짜') || header.includes('일자') || header.includes('date')) {
      dateCol = i;
    } else if (header.includes('계좌') || header.includes('증권사') || header.includes('account')) {
      accountCol = i;
    } else if (header.includes('구분') || header.includes('type')) {
      typeCol = i;
    } else if (header.includes('금액') || header.includes('입금') || header.includes('amount')) {
      if (amountCol === -1) amountCol = i;
    } else if (header.includes('메모') || header.includes('비고') || header.includes('memo')) {
      memoCol = i;
    }
  }

  // 헤더를 찾지 못한 경우 기본값 (일자=0, 구분=4, 계좌=5, 금액=6, 비고=7)
  if (dateCol === -1) dateCol = 0;
  if (typeCol === -1) typeCol = 4; // E열이 구분 (입금/출금)
  if (accountCol === -1) accountCol = 5; // F열이 계좌(증권사)
  if (amountCol === -1) amountCol = 6;
  if (memoCol === -1) memoCol = 7;

  console.log('[parseDepositData] Header row:', JSON.stringify(headerRow));
  console.log('[parseDepositData] Column indices:', { dateCol, typeCol, amountCol, memoCol });

  // 첫 10개 행 디버깅 (구조 파악)
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (row && row.length > 0) {
      console.log(`[parseDepositData] Row ${i} (${row.length} cols):`, JSON.stringify(row));
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    // 날짜 찾기 (여러 컬럼에서 검색)
    let date: string | null = null;
    let dateColIdx = -1;
    for (let col = 0; col < Math.min(row.length, 5); col++) {
      date = parseDate(row[col]);
      if (date) {
        dateColIdx = col;
        break;
      }
    }
    if (!date) continue;

    // 금액 찾기 - ₩ 기호가 포함된 컬럼 찾기
    let amount = 0;
    let memoValue = '';
    let isWithdraw = false;

    for (let col = 0; col < row.length; col++) {
      const cellValue = String(row[col] || '');
      // ₩ 기호가 있는 컬럼이 금액
      if (cellValue.includes('₩') || cellValue.includes('\\')) {
        isWithdraw = isNegativeAmount(cellValue);
        const parsed = parseNumber(cellValue);
        if (parsed > 0) {
          amount = parsed;
          // 다음 컬럼이 memo
          if (col + 1 < row.length) {
            memoValue = String(row[col + 1] || '');
          }
          break;
        }
      }
    }

    // ₩ 기호가 없으면 큰 숫자(10000 이상) 찾기
    if (amount === 0) {
      for (let col = dateColIdx + 1; col < row.length; col++) {
        const cellValue = String(row[col] || '');
        isWithdraw = isNegativeAmount(cellValue);
        const parsed = parseNumber(cellValue);
        if (parsed >= 10000) {
          amount = parsed;
          if (col + 1 < row.length) {
            memoValue = String(row[col + 1] || '');
          }
          break;
        }
      }
    }

    if (amount === 0) continue;

    // 구분 컬럼에서 입금/출금 확인 (더 정확한 방법)
    const typeValue = String(row[typeCol] || '').trim().toLowerCase();
    if (typeValue.includes('출금') || typeValue === 'withdraw') {
      isWithdraw = true;
    } else if (typeValue.includes('입금') || typeValue === 'deposit') {
      isWithdraw = false;
    }
    // typeValue가 비어있으면 금액의 음수 여부로 판단 (위에서 이미 설정됨)

    const type: 'DEPOSIT' | 'WITHDRAW' = isWithdraw ? 'WITHDRAW' : 'DEPOSIT';

    // 계좌 정보 추출
    const accountValue = String(row[accountCol] || '').trim();

    const record: DepositRecord = {
      date,
      type,
      amount: Math.abs(amount),
      memo: memoValue,
      account: accountValue,
    };

    // 처음 5개 결과 디버깅
    if (results.length < 5) {
      console.log(`[parseDepositData] Parsed record ${results.length + 1}:`, JSON.stringify(record));
    }

    results.push(record);
  }

  console.log('[parseDepositData] Parsed records:', results.length);
  return results;
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

/**
 * 월별 계좌추세 데이터 타입 (누적입금액 vs 계좌총액)
 */
export interface AccountTrendData {
  date: string; // "23.01" 형식
  cumulativeDeposit: number; // 누적입금액
  totalAccount: number; // 계좌총액
}

/**
 * "5. 계좌내역(누적)" 시트의 계좌추세 데이터 파싱
 * 범위: G17:AB78 (G열=날짜, H열=누적입금액, L열=계좌총액)
 */
export function parseAccountTrendData(rows: any[]): AccountTrendData[] {
  if (!rows || rows.length === 0) return [];

  const parseNumber = (val: any): number => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[₩$,%\s,]/g, '');
    return Number.parseFloat(cleaned) || 0;
  };

  console.log('[parseAccountTrendData] Total rows:', rows.length);

  const results: AccountTrendData[] = [];

  // G17:AB78 범위에서 가져왔으므로:
  // - Column 0 (G) = 날짜 (YY.MM 형식)
  // - Column 1 (H) = 계좌총액 (평가금액)
  // - Column 5 (L) = 누적입금액 (G+5=L)

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // 첫 번째 셀에서 날짜 찾기 (YY.MM 형식)
    const dateCell = String(row[0] || '').trim();
    if (!/^\d{2}\.\d{2}$/.test(dateCell)) continue;

    const totalAccount = parseNumber(row[1]); // H열 (index 1) - 계좌총액
    const cumulativeDeposit = parseNumber(row[5]); // L열 (index 5) - 누적입금액

    // 데이터가 있는 행만 포함
    if (cumulativeDeposit > 0 || totalAccount > 0) {
      results.push({
        date: dateCell,
        cumulativeDeposit: Math.round(cumulativeDeposit),
        totalAccount: Math.round(totalAccount),
      });
    }
  }

  console.log('[parseAccountTrendData] Parsed records:', results.length);
  if (results.length > 0) {
    console.log('[parseAccountTrendData] First:', JSON.stringify(results[0]));
    console.log('[parseAccountTrendData] Last:', JSON.stringify(results[results.length - 1]));
  }

  return results;
}

/**
 * 월별 수익률 비교 데이터 타입
 */
export interface PerformanceComparisonData {
  date: string; // "23.01" 형식
  portfolio: number; // 계좌종합 수익률 (%)
  kospi: number; // 코스피 수익률 (%)
  sp500: number; // S&P500 수익률 (%)
  nasdaq: number; // 나스닥 수익률 (%)
}

/**
 * "5. 계좌내역(누적)" 시트의 수익률 비교 데이터 파싱
 * 범위: G17:AB78 (G열=날짜, O~R열=수익률 데이터)
 */
export function parsePerformanceComparisonData(rows: any[]): PerformanceComparisonData[] {
  if (!rows || rows.length === 0) return [];

  const parsePercent = (val: any): number => {
    if (!val) return 0;
    const str = String(val).replace(/[%,\s]/g, '');
    const num = Number.parseFloat(str);
    // 소수점 형태(0.15)를 퍼센트(15%)로 변환
    if (!Number.isNaN(num) && Math.abs(num) < 10) {
      return num * 100;
    }
    return num || 0;
  };

  console.log('[parsePerformanceComparisonData] Total rows:', rows.length);
  console.log('[parsePerformanceComparisonData] First row:', JSON.stringify(rows[0]));
  if (rows.length > 1) {
    console.log('[parsePerformanceComparisonData] Second row:', JSON.stringify(rows[1]));
  }
  if (rows.length > 2) {
    console.log('[parsePerformanceComparisonData] Third row:', JSON.stringify(rows[2]));
  }

  const results: PerformanceComparisonData[] = [];

  // G17:AB78 범위에서 가져왔으므로:
  // - Column 0 (G) = 날짜 (YY.MM 형식)
  // - Column 8 (O) = 계좌종합 수익률
  // - Column 9 (P) = 코스피
  // - Column 10 (Q) = S&P500
  // - Column 11 (R) = 나스닥
  // 하지만 실제 구조를 확인해야 함

  // 첫 번째 행은 헤더일 수 있으므로 스킵
  const startIdx = rows[0] && String(rows[0][0]).includes('날짜') ? 1 : 0;

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    // 첫 번째 셀에서 날짜 찾기 (YY.MM 형식)
    const dateCell = String(row[0] || '').trim();
    if (!/^\d{2}\.\d{2}$/.test(dateCell)) continue;

    // 수익률 데이터 찾기 (인덱스 8, 9, 10, 11)
    // 데이터는 100을 기준점으로 하는 인덱스 형식 (100 = 0%, 150 = 50%)
    const portfolioIdx = parsePercent(row[8]);
    const kospiIdx = parsePercent(row[9]);
    const sp500Idx = parsePercent(row[10]);
    const nasdaqIdx = parsePercent(row[11]);

    // 인덱스 값을 백분율 변화로 변환 (100 -> 0%, 150 -> 50%)
    const portfolio = portfolioIdx > 0 ? portfolioIdx - 100 : 0;
    const kospi = kospiIdx > 0 ? kospiIdx - 100 : 0;
    const sp500 = sp500Idx > 0 ? sp500Idx - 100 : 0;
    const nasdaq = nasdaqIdx > 0 ? nasdaqIdx - 100 : 0;

    // 미래 데이터(모든 인덱스가 0)는 제외
    if (portfolioIdx === 0 && kospiIdx === 0 && sp500Idx === 0 && nasdaqIdx === 0) continue;

    results.push({
      date: dateCell,
      portfolio: Math.round(portfolio * 10) / 10,
      kospi: Math.round(kospi * 10) / 10,
      sp500: Math.round(sp500 * 10) / 10,
      nasdaq: Math.round(nasdaq * 10) / 10,
    });
  }

  console.log('[parsePerformanceComparisonData] Parsed records:', results.length);
  if (results.length > 0) {
    console.log('[parsePerformanceComparisonData] First:', JSON.stringify(results[0]));
    console.log('[parsePerformanceComparisonData] Last:', JSON.stringify(results[results.length - 1]));
  }

  return results;
}

/**
 * 수익률 비교 바 차트 데이터 타입
 */
export interface YieldComparisonData {
  thisYearYield: {
    account: number;
    kospi: number;
    sp500: number;
    nasdaq: number;
  };
  annualizedYield: {
    account: number;
    kospi: number;
    sp500: number;
    nasdaq: number;
  };
}

/**
 * 수익률 비교(달러환율 적용) 바 차트 데이터 타입
 */
export interface YieldComparisonDollarData {
  thisYearYield: {
    account: number;
    kospi: number;
    sp500: number;
    nasdaq: number;
    dollar: number; // 달러 환율 수익률
  };
  annualizedYield: {
    account: number;
    kospi: number;
    sp500: number;
    nasdaq: number;
    dollar: number; // 달러 환율 연평균 수익률
  };
}

/**
 * "5. 계좌내역(누적)" 시트에서 수익률 비교 데이터 파싱
 * 현재 연월의 데이터에서 올해 수익률과 연평균 수익률 계산
 */
export function parseYieldComparisonData(rows: any[]): YieldComparisonData | null {
  if (!rows || rows.length === 0) return null;

  const parsePercent = (val: any): number => {
    if (!val) return 0;
    const str = String(val).replace(/[%,\s]/g, '');
    const num = Number.parseFloat(str);
    // 소수점 형태(0.15)를 퍼센트(15%)로 변환
    if (!Number.isNaN(num) && Math.abs(num) < 10) {
      return num * 100;
    }
    return num || 0;
  };

  // 현재 연월 계산
  const now = new Date();
  const currentYY = String(now.getFullYear()).slice(2);
  const currentMM = String(now.getMonth() + 1).padStart(2, '0');
  const currentDateStr = `${currentYY}.${currentMM}`;

  // G17:AB78 범위 기준 컬럼 인덱스:
  // G(0)=날짜, H(1)=평가금액, ...O(8)=계좌지수, P(9)=코스피, Q(10)=S&P500, R(11)=나스닥

  // 현재 월 데이터 찾기
  let currentRow: any[] | null = null;
  let prevYearRow: any[] | null = null; // 작년 12월 데이터

  // 작년 12월 날짜 계산
  const prevYear = now.getFullYear() - 1;
  const prevYearDateStr = `${String(prevYear).slice(2)}.12`;

  for (const row of rows) {
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    const dateCell = String(row[0] || '').trim();

    if (dateCell === currentDateStr) {
      currentRow = row;
    }
    if (dateCell === prevYearDateStr) {
      prevYearRow = row;
    }
  }

  // 현재 월 데이터가 없으면 가장 최근 데이터 사용
  if (!currentRow) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;
      const dateCell = String(row[0] || '').trim();
      if (/^\d{2}\.\d{2}$/.test(dateCell)) {
        currentRow = row;
        break;
      }
    }
  }

  if (!currentRow) return null;

  // 올해 수익률 계산
  // 시트의 O열(index 8)은 계좌지수 (100 기준)
  const currentAccountIdx = parsePercent(currentRow[8]); // O열
  const currentKospiIdx = parsePercent(currentRow[9]); // P열
  const currentSp500Idx = parsePercent(currentRow[10]); // Q열
  const currentNasdaqIdx = parsePercent(currentRow[11]); // R열

  let prevAccountIdx = 100;
  let prevKospiIdx = 100;
  let prevSp500Idx = 100;
  let prevNasdaqIdx = 100;

  if (prevYearRow) {
    prevAccountIdx = parsePercent(prevYearRow[8]) || 100;
    prevKospiIdx = parsePercent(prevYearRow[9]) || 100;
    prevSp500Idx = parsePercent(prevYearRow[10]) || 100;
    prevNasdaqIdx = parsePercent(prevYearRow[11]) || 100;
  }

  // 올해 수익률 계산 (작년말 대비 증감률)
  const thisYearYield = {
    account: prevAccountIdx > 0 ? ((currentAccountIdx / prevAccountIdx) - 1) * 100 : 0,
    kospi: prevKospiIdx > 0 ? ((currentKospiIdx / prevKospiIdx) - 1) * 100 : 0,
    sp500: prevSp500Idx > 0 ? ((currentSp500Idx / prevSp500Idx) - 1) * 100 : 0,
    nasdaq: prevNasdaqIdx > 0 ? ((currentNasdaqIdx / prevNasdaqIdx) - 1) * 100 : 0,
  };

  // 누적 수익률
  const cumulativeYield = currentAccountIdx - 100;
  const cumulativeKospi = currentKospiIdx - 100;
  const cumulativeSp500 = currentSp500Idx - 100;
  const cumulativeNasdaq = currentNasdaqIdx - 100;

  // 투자 기간 계산 (첫 데이터부터 현재까지)
  let firstDate: string | null = null;
  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue;
    const dateCell = String(row[0] || '').trim();
    if (/^\d{2}\.\d{2}$/.test(dateCell)) {
      firstDate = dateCell;
      break;
    }
  }

  let years = 1;
  if (firstDate) {
    const [firstYY, firstMM] = firstDate.split('.').map(Number);
    const firstYear = 2000 + (firstYY || 0);
    const firstMonth = firstMM || 1;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    years = Math.max(1, (currentYear - firstYear) + (currentMonth - firstMonth) / 12);
  }

  // 연평균 수익률 계산: (1 + 누적수익률)^(1/연수) - 1
  const calcAnnualized = (cumulative: number): number => {
    const total = 1 + cumulative / 100;
    if (total <= 0 || years <= 0) return 0;
    return (total ** (1 / years) - 1) * 100;
  };

  const annualizedYield = {
    account: calcAnnualized(cumulativeYield),
    kospi: calcAnnualized(cumulativeKospi),
    sp500: calcAnnualized(cumulativeSp500),
    nasdaq: calcAnnualized(cumulativeNasdaq),
  };

  // 소수점 한 자리로 반올림
  const round = (n: number) => Math.round(n * 10) / 10;

  return {
    thisYearYield: {
      account: round(thisYearYield.account),
      kospi: round(thisYearYield.kospi),
      sp500: round(thisYearYield.sp500),
      nasdaq: round(thisYearYield.nasdaq),
    },
    annualizedYield: {
      account: round(annualizedYield.account),
      kospi: round(annualizedYield.kospi),
      sp500: round(annualizedYield.sp500),
      nasdaq: round(annualizedYield.nasdaq),
    },
  };
}

/**
 * "5. 계좌내역(누적)" 시트에서 수익률 비교(달러환율 적용) 데이터 파싱
 *
 * 범위: G17:AQ78
 * - G열(0) = 날짜 (YY.MM)
 * - 달러환율 적용 지수 컬럼들: AI~AM (28~32)
 *   (기본 지수 컬럼 O~R에서 +20 오프셋)
 */
export function parseYieldComparisonDollarData(rows: any[]): YieldComparisonDollarData | null {
  if (!rows || rows.length === 0) return null;

  // 헤더 행 로그
  const headerRow = rows[0];
  console.log('[parseYieldComparisonDollarData] Header row (28-36):', headerRow?.slice(28, 37));

  const parsePercent = (val: any): number => {
    if (!val || val === '#NUM!' || val === '#VALUE!' || val === '#DIV/0!' || val === '#REF!') return 0;
    const str = String(val).replace(/[%,\s]/g, '');
    const num = Number.parseFloat(str);
    if (Number.isNaN(num)) return 0;
    // 소수점 형태(0.15 = 15%)를 퍼센트로 변환
    if (Math.abs(num) < 2 && num !== 0) {
      return num * 100;
    }
    return num;
  };

  // 현재 연월 계산
  const now = new Date();
  const currentYY = String(now.getFullYear()).slice(2);
  const currentMM = String(now.getMonth() + 1).padStart(2, '0');
  const currentDateStr = `${currentYY}.${currentMM}`;

  // 작년 12월 날짜
  const prevYear = now.getFullYear() - 1;
  const prevYearDateStr = `${String(prevYear).slice(2)}.12`;

  let currentRow: any[] | null = null;
  let prevYearRow: any[] | null = null;

  for (const row of rows) {
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    const dateCell = String(row[0] || '').trim();

    if (dateCell === currentDateStr) {
      currentRow = row;
    }
    if (dateCell === prevYearDateStr) {
      prevYearRow = row;
    }
  }

  // 현재 월 데이터가 없으면 가장 최근 데이터 사용
  if (!currentRow) {
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;
      const dateCell = String(row[0] || '').trim();
      if (/^\d{2}\.\d{2}$/.test(dateCell)) {
        currentRow = row;
        break;
      }
    }
  }

  if (!currentRow) {
    return null;
  }

  // Debug: 현재 행의 컬럼 값 출력
  console.log('[parseYieldComparisonDollarData] Current date:', currentRow[0]);
  console.log('[parseYieldComparisonDollarData] Row length:', currentRow.length);
  console.log('[parseYieldComparisonDollarData] Header 20-27 (AA~AH):', headerRow?.slice(20, 28));
  console.log('[parseYieldComparisonDollarData] Columns 20-27 (AA~AH):', currentRow.slice(20, 28));
  console.log('[parseYieldComparisonDollarData] Columns 28-36 (AI~AQ):', currentRow.slice(28, 37));

  // G17:AQ78 범위 기준 컬럼 인덱스 (G=0 기준):
  // 시트 공식: T열(실제 지수값)을 사용하여 수익률 계산
  const COL_ACCOUNT = 8;          // O열 - 계좌종합 지수 (100 기준)
  const COL_KOSPI = 13;           // T열 - 코스피 실제 지수값
  const COL_SP500_DOLLAR = 28;    // AI열 - S&P500 달러환율 적용 지수
  const COL_NASDAQ_DOLLAR = 29;   // AJ열 - NASDAQ 달러환율 적용 지수
  const COL_DOLLAR_THIS_YEAR = 23; // AD열 - 달러 환율값 (올해 수익률 계산용)
  const COL_DOLLAR_ANNUAL = 27;   // AH열 - DOLLAR 지수 (연평균 계산용)

  // 환율 값 파싱 (₩1,467 → 1467)
  const parseExchangeRate = (val: any): number => {
    if (!val) return 0;
    const str = String(val).replace(/[₩$,\s원]/g, '');
    const num = Number.parseFloat(str);
    return Number.isNaN(num) ? 0 : num;
  };

  // 달러환율 적용 지수 데이터 (100 기준)
  const currentAccountIdx = parsePercent(currentRow[COL_ACCOUNT]);
  const currentKospiIdx = parsePercent(currentRow[COL_KOSPI]);
  const currentSp500Idx = parsePercent(currentRow[COL_SP500_DOLLAR]);
  const currentNasdaqIdx = parsePercent(currentRow[COL_NASDAQ_DOLLAR]);
  // 달러 환율값 (올해 수익률 계산용) - AD열
  const currentDollarExchangeRate = parseExchangeRate(currentRow[COL_DOLLAR_THIS_YEAR]);
  // 달러 지수값 (연평균 계산용) - AH열
  const currentDollarIdx = parsePercent(currentRow[COL_DOLLAR_ANNUAL]);

  let prevAccountIdx = 100;
  let prevKospiIdx = 100;
  let prevSp500Idx = 100;
  let prevNasdaqIdx = 100;
  let prevDollarExchangeRate = 0;
  let prevDollarIdx = 100;

  if (prevYearRow) {
    prevAccountIdx = parsePercent(prevYearRow[COL_ACCOUNT]) || 100;
    prevKospiIdx = parsePercent(prevYearRow[COL_KOSPI]) || 100;
    prevSp500Idx = parsePercent(prevYearRow[COL_SP500_DOLLAR]) || 100;
    prevNasdaqIdx = parsePercent(prevYearRow[COL_NASDAQ_DOLLAR]) || 100;
    prevDollarExchangeRate = parseExchangeRate(prevYearRow[COL_DOLLAR_THIS_YEAR]);
    prevDollarIdx = parsePercent(prevYearRow[COL_DOLLAR_ANNUAL]) || 100;
  }

  console.log('[parseYieldComparisonDollarData] Current indices:', { currentAccountIdx, currentKospiIdx, currentSp500Idx, currentNasdaqIdx, currentDollarIdx });
  console.log('[parseYieldComparisonDollarData] Prev indices:', { prevAccountIdx, prevKospiIdx, prevSp500Idx, prevNasdaqIdx, prevDollarIdx });
  console.log('[parseYieldComparisonDollarData] Dollar exchange rates:', { current: currentDollarExchangeRate, prev: prevDollarExchangeRate });

  // 올해 수익률 계산 (작년말 대비 증감률)
  const thisYearYield = {
    account: prevAccountIdx > 0 ? ((currentAccountIdx / prevAccountIdx) - 1) * 100 : 0,
    kospi: prevKospiIdx > 0 ? ((currentKospiIdx / prevKospiIdx) - 1) * 100 : 0,
    sp500: prevSp500Idx > 0 ? ((currentSp500Idx / prevSp500Idx) - 1) * 100 : 0,
    nasdaq: prevNasdaqIdx > 0 ? ((currentNasdaqIdx / prevNasdaqIdx) - 1) * 100 : 0,
    // 달러 올해 수익률: 환율 변동률 (AD열 사용)
    dollar: prevDollarExchangeRate > 0 ? ((currentDollarExchangeRate / prevDollarExchangeRate) - 1) * 100 : 0,
  };

  // 누적 수익률 (100 기준 대비)
  const cumulativeYield = currentAccountIdx - 100;
  const cumulativeKospi = currentKospiIdx - 100;
  const cumulativeSp500 = currentSp500Idx - 100;
  const cumulativeNasdaq = currentNasdaqIdx - 100;
  const cumulativeDollar = currentDollarIdx - 100;

  // 투자 기간 계산
  let firstDate: string | null = null;
  for (const row of rows) {
    if (!row || !Array.isArray(row)) continue;
    const dateCell = String(row[0] || '').trim();
    if (/^\d{2}\.\d{2}$/.test(dateCell)) {
      firstDate = dateCell;
      break;
    }
  }

  let years = 1;
  if (firstDate) {
    const [firstYY, firstMM] = firstDate.split('.').map(Number);
    const firstYear = 2000 + (firstYY || 0);
    const firstMonth = firstMM || 1;
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    years = Math.max(1, (currentYear - firstYear) + (currentMonth - firstMonth) / 12);
  }

  // 연평균 수익률 계산
  const calcAnnualized = (cumulative: number): number => {
    const total = 1 + cumulative / 100;
    if (total <= 0 || years <= 0) return 0;
    return (total ** (1 / years) - 1) * 100;
  };

  const annualizedYield = {
    account: calcAnnualized(cumulativeYield),
    kospi: calcAnnualized(cumulativeKospi),
    sp500: calcAnnualized(cumulativeSp500),
    nasdaq: calcAnnualized(cumulativeNasdaq),
    dollar: calcAnnualized(cumulativeDollar),
  };

  const round = (n: number) => Math.round(n * 10) / 10;

  const result: YieldComparisonDollarData = {
    thisYearYield: {
      account: round(thisYearYield.account),
      kospi: round(thisYearYield.kospi),
      sp500: round(thisYearYield.sp500),
      nasdaq: round(thisYearYield.nasdaq),
      dollar: round(thisYearYield.dollar),
    },
    annualizedYield: {
      account: round(annualizedYield.account),
      kospi: round(annualizedYield.kospi),
      sp500: round(annualizedYield.sp500),
      nasdaq: round(annualizedYield.nasdaq),
      dollar: round(annualizedYield.dollar),
    },
  };

  console.log('[parseYieldComparisonDollarData] Result:', JSON.stringify(result));

  return result;
}
