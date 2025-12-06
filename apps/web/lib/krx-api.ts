/**
 * KRX OPEN API 클라이언트
 * https://openapi.krx.co.kr/
 */

const KRX_API_BASE = 'https://data-dbg.krx.co.kr/svc/apis';

export interface KRXStock {
  code: string;        // 단축코드 (예: 005930)
  name: string;        // 종목명 (예: 삼성전자)
  fullCode: string;    // 표준코드 (ISIN)
  market: string;      // 시장구분 (KOSPI, KOSDAQ, ETF)
  engName?: string;    // 영문명
}

interface KRXStockResponse {
  ISU_CD: string;      // 표준코드
  ISU_SRT_CD: string;  // 단축코드
  ISU_NM: string;      // 한글 종목명
  ISU_ABBRV: string;   // 한글 종목약명
  ISU_ENG_NM: string;  // 영문 종목명
  MKT_TP_NM: string;   // 시장구분
}

interface KRXETFResponse {
  ISU_CD: string;      // 종목코드
  ISU_NM: string;      // 종목명
}

interface KRXAPIResponse<T> {
  OutBlock_1: T[];
}

/**
 * 기준일자 포맷 (YYYYMMDD)
 */
function getBaseDateString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 가장 최근 영업일 계산 (주말 제외)
 */
function getLastBusinessDate(): Date {
  const date = new Date();
  const day = date.getDay();

  // 일요일(0)이면 2일 전, 토요일(6)이면 1일 전
  if (day === 0) {
    date.setDate(date.getDate() - 2);
  } else if (day === 6) {
    date.setDate(date.getDate() - 1);
  }

  return date;
}

/**
 * KRX API 호출
 */
async function fetchKRX<T>(endpoint: string, basDd: string): Promise<T[]> {
  const apiKey = process.env.KRX_API_KEY;

  if (!apiKey) {
    console.error('[KRX API] KRX_API_KEY is not set');
    throw new Error('KRX API Key가 설정되지 않았습니다.');
  }

  const url = `${KRX_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AUTH_KEY': apiKey,
    },
    body: JSON.stringify({ basDd }),
  });

  if (!response.ok) {
    console.error('[KRX API] Request failed:', response.status, response.statusText);
    throw new Error(`KRX API 요청 실패: ${response.status}`);
  }

  const data: KRXAPIResponse<T> = await response.json();
  return data.OutBlock_1 || [];
}

/**
 * 유가증권(KOSPI) 종목 조회
 */
export async function fetchKOSPIStocks(): Promise<KRXStock[]> {
  const basDd = getBaseDateString(getLastBusinessDate());
  const data = await fetchKRX<KRXStockResponse>('/sto/stk_isu_base_info', basDd);

  return data.map((item) => ({
    code: item.ISU_SRT_CD,
    name: item.ISU_ABBRV || item.ISU_NM,
    fullCode: item.ISU_CD,
    market: 'KOSPI',
    engName: item.ISU_ENG_NM,
  }));
}

/**
 * 코스닥(KOSDAQ) 종목 조회
 */
export async function fetchKOSDAQStocks(): Promise<KRXStock[]> {
  const basDd = getBaseDateString(getLastBusinessDate());
  const data = await fetchKRX<KRXStockResponse>('/sto/ksq_isu_base_info', basDd);

  return data.map((item) => ({
    code: item.ISU_SRT_CD,
    name: item.ISU_ABBRV || item.ISU_NM,
    fullCode: item.ISU_CD,
    market: 'KOSDAQ',
    engName: item.ISU_ENG_NM,
  }));
}

/**
 * ETF 종목 조회
 */
export async function fetchETFStocks(): Promise<KRXStock[]> {
  const basDd = getBaseDateString(getLastBusinessDate());
  const data = await fetchKRX<KRXETFResponse>('/etp/etf_bydd_trd', basDd);

  return data.map((item) => ({
    code: item.ISU_CD,
    name: item.ISU_NM,
    fullCode: item.ISU_CD,
    market: 'ETF',
  }));
}

/**
 * 전체 종목 조회 (KOSPI + KOSDAQ + ETF)
 */
export async function fetchAllStocks(): Promise<KRXStock[]> {
  const [kospi, kosdaq, etf] = await Promise.all([
    fetchKOSPIStocks(),
    fetchKOSDAQStocks(),
    fetchETFStocks(),
  ]);

  return [...kospi, ...kosdaq, ...etf];
}

/**
 * 종목 검색 (이름 또는 코드로)
 */
export function searchStocks(stocks: KRXStock[], query: string): KRXStock[] {
  const q = query.toLowerCase().trim();

  if (!q) return [];

  return stocks.filter((stock) => {
    return (
      stock.code.toLowerCase().includes(q) ||
      stock.name.toLowerCase().includes(q) ||
      stock.engName?.toLowerCase().includes(q)
    );
  }).slice(0, 20); // 최대 20개
}
