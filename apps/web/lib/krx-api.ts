/**
 * KRX OPEN API 클라이언트
 * https://data.krx.co.kr/
 *
 * 사용 API:
 * - 유가증권 종목기본정보 (stk_isu_base_info)
 * - 코스닥 종목기본정보 (ksq_isu_base_info)
 * - ETF 일별매매정보 (etf_bydd_trd)
 */

const KRX_API_BASE = "https://data-dbg.krx.co.kr/svc/apis";

export interface KRXStock {
  code: string; // 단축코드 (예: 005930) 또는 ETF 종목코드
  name: string; // 종목명 (예: 삼성전자)
  fullCode: string; // 표준코드 (ISIN)
  market: string; // 시장구분 (KOSPI, KOSDAQ, ETF)
  engName?: string; // 영문명
}

/**
 * 유가증권/코스닥 종목기본정보 응답
 */
interface KRXStockResponse {
  ISU_CD: string; // 표준코드
  ISU_SRT_CD: string; // 단축코드
  ISU_NM: string; // 한글 종목명
  ISU_ABBRV: string; // 한글 종목약명
  ISU_ENG_NM: string; // 영문 종목명
  LIST_DD: string; // 상장일
  MKT_TP_NM: string; // 시장구분
  SECUGRP_NM: string; // 증권구분
  SECT_TP_NM: string; // 소속부
  KIND_STKCERT_TP_NM: string; // 주식종류
  PARVAL: string; // 액면가
  LIST_SHRS: string; // 상장주식수
}

/**
 * ETF 일별매매정보 응답
 */
interface KRXETFResponse {
  BAS_DD: string; // 기준일자
  ISU_CD: string; // 종목코드
  ISU_NM: string; // 종목명
  TDD_CLSPRC: string; // 종가
  CMPPREVDD_PRC: string; // 대비
  FLUC_RT: string; // 등락률
  NAV: string; // 순자산가치(NAV)
  TDD_OPNPRC: string; // 시가
  TDD_HGPRC: string; // 고가
  TDD_LWPRC: string; // 저가
  ACC_TRDVOL: string; // 거래량
  ACC_TRDVAL: string; // 거래대금
  MKTCAP: string; // 시가총액
  INVSTASST_NETASST_TOTAMT: string; // 순자산총액
  LIST_SHRS: string; // 상장좌수
  IDX_IND_NM: string; // 기초지수_지수명
  OBJ_STKPRC_IDX: string; // 기초지수_종가
  CMPPREVDD_IDX: string; // 기초지수_대비
  FLUC_RT_IDX: string; // 기초지수_등락률
}

interface KRXAPIResponse<T> {
  OutBlock_1?: T[];
  respCode?: string;
  respMsg?: string;
}

/**
 * 기준일자 포맷 (YYYYMMDD)
 */
function getBaseDateString(date?: Date): string {
  const d = date || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 최근 영업일 후보 목록 생성 (최대 10일)
 * - 주말 제외
 * - 공휴일은 API 호출로 확인 (데이터 없으면 다음 날짜 시도)
 */
function getRecentBusinessDates(): Date[] {
  const now = new Date();
  const dates: Date[] = [];
  const date = new Date(now);
  const hour = now.getHours();

  // 오후 6시(18시) 이전이면 전일부터 시작
  if (hour < 18) {
    date.setDate(date.getDate() - 1);
  }

  // 최대 10일간의 영업일 후보 생성
  for (let i = 0; i < 10 && dates.length < 5; i++) {
    const day = date.getDay();
    
    // 주말이 아니면 후보에 추가
    if (day !== 0 && day !== 6) {
      dates.push(new Date(date));
    }
    
    date.setDate(date.getDate() - 1);
  }

  return dates;
}

/**
 * 가장 최근 영업일 계산 (단일)
 * - 주말 제외
 * - 오후 6시 이전이면 전일
 */
function getLastBusinessDate(): Date {
  const dates = getRecentBusinessDates();
  return dates[0] || new Date();
}

/**
 * KRX API 호출
 */
async function fetchKRX<T>(endpoint: string, basDd: string): Promise<T[]> {
  const apiKey = process.env.KRX_API_KEY;

  if (!apiKey) {
    console.error("[KRX API] KRX_API_KEY is not set");
    throw new Error(
      "KRX API Key가 설정되지 않았습니다. 환경변수를 확인해주세요."
    );
  }

  const url = `${KRX_API_BASE}${endpoint}`;

  console.log(`[KRX API] Fetching ${endpoint} for date ${basDd}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      AUTH_KEY: apiKey,
    },
    body: JSON.stringify({ basDd }),
  });

  if (!response.ok) {
    console.error(
      "[KRX API] HTTP Error:",
      response.status,
      response.statusText
    );
    throw new Error(`KRX API HTTP 오류: ${response.status}`);
  }

  const data: KRXAPIResponse<T> = await response.json();

  // API 응답 에러 체크
  if (data.respCode && data.respCode !== "200") {
    console.error("[KRX API] Response Error:", data.respCode, data.respMsg);

    if (data.respCode === "401") {
      throw new Error(
        "KRX API 인증 실패: API KEY가 승인되지 않았거나 해당 API 이용신청이 필요합니다."
      );
    }

    throw new Error(`KRX API 오류: ${data.respMsg || data.respCode}`);
  }

  const result = data.OutBlock_1 || [];
  console.log(`[KRX API] Received ${result.length} items from ${endpoint}`);

  return result;
}

/**
 * 유가증권(KOSPI) 종목 조회
 */
export async function fetchKOSPIStocks(): Promise<KRXStock[]> {
  const basDd = getBaseDateString(getLastBusinessDate());
  return fetchKOSPIStocksForDate(basDd);
}

/**
 * 코스닥(KOSDAQ) 종목 조회
 */
export async function fetchKOSDAQStocks(): Promise<KRXStock[]> {
  const basDd = getBaseDateString(getLastBusinessDate());
  return fetchKOSDAQStocksForDate(basDd);
}

/**
 * ETF 종목 조회
 */
export async function fetchETFStocks(): Promise<KRXStock[]> {
  const basDd = getBaseDateString(getLastBusinessDate());
  return fetchETFStocksForDate(basDd);
}

/**
 * 특정 날짜로 KOSPI 종목 조회
 */
async function fetchKOSPIStocksForDate(basDd: string): Promise<KRXStock[]> {
  const data = await fetchKRX<KRXStockResponse>(
    "/sto/stk_isu_base_info",
    basDd
  );

  return data
    .filter((item) => item.ISU_SRT_CD && item.ISU_NM)
    .map((item) => ({
      code: item.ISU_SRT_CD,
      name: item.ISU_ABBRV || item.ISU_NM,
      fullCode: item.ISU_CD,
      market: "KOSPI",
      engName: item.ISU_ENG_NM,
    }));
}

/**
 * 특정 날짜로 KOSDAQ 종목 조회
 */
async function fetchKOSDAQStocksForDate(basDd: string): Promise<KRXStock[]> {
  const data = await fetchKRX<KRXStockResponse>(
    "/sto/ksq_isu_base_info",
    basDd
  );

  return data
    .filter((item) => item.ISU_SRT_CD && item.ISU_NM)
    .map((item) => ({
      code: item.ISU_SRT_CD,
      name: item.ISU_ABBRV || item.ISU_NM,
      fullCode: item.ISU_CD,
      market: "KOSDAQ",
      engName: item.ISU_ENG_NM,
    }));
}

/**
 * 특정 날짜로 ETF 종목 조회
 */
async function fetchETFStocksForDate(basDd: string): Promise<KRXStock[]> {
  const data = await fetchKRX<KRXETFResponse>("/etp/etf_bydd_trd", basDd);

  return data
    .filter((item) => item.ISU_CD && item.ISU_NM)
    .map((item) => ({
      code: item.ISU_CD,
      name: item.ISU_NM,
      fullCode: item.ISU_CD,
      market: "ETF",
    }));
}

/**
 * 전체 종목 조회 (KOSPI + KOSDAQ + ETF)
 * - 여러 날짜를 순차적으로 시도 (공휴일 대응)
 * - 일부 API 실패해도 나머지는 반환
 */
export async function fetchAllStocks(): Promise<KRXStock[]> {
  const candidateDates = getRecentBusinessDates();
  
  console.log(`[KRX API] Trying dates: ${candidateDates.map(d => getBaseDateString(d)).join(', ')}`);

  // 각 날짜를 순차적으로 시도
  for (const date of candidateDates) {
    const basDd = getBaseDateString(date);
    console.log(`[KRX API] Attempting to fetch stocks for date: ${basDd}`);

    try {
      const results = await Promise.allSettled([
        fetchKOSPIStocksForDate(basDd),
        fetchKOSDAQStocksForDate(basDd),
        fetchETFStocksForDate(basDd),
      ]);

      const stocks: KRXStock[] = [];
      let hasData = false;

      results.forEach((result, index) => {
        const markets = ["KOSPI", "KOSDAQ", "ETF"];
        if (result.status === "fulfilled" && result.value.length > 0) {
          stocks.push(...result.value);
          hasData = true;
          console.log(`[KRX API] ${markets[index]}: ${result.value.length} stocks`);
        } else if (result.status === "rejected") {
          console.error(`[KRX API] Failed to fetch ${markets[index]}:`, result.reason);
        }
      });

      // 데이터가 있으면 반환
      if (hasData && stocks.length > 0) {
        console.log(`[KRX API] Successfully fetched ${stocks.length} stocks for date ${basDd}`);
        return stocks;
      }

      console.log(`[KRX API] No data for date ${basDd}, trying previous date...`);
    } catch (error) {
      console.error(`[KRX API] Error fetching for date ${basDd}:`, error);
    }
  }

  console.error('[KRX API] Failed to fetch stocks for all candidate dates');
  return [];
}

/**
 * 종목 검색 (이름 또는 코드로)
 */
export function searchStocks(stocks: KRXStock[], query: string): KRXStock[] {
  const q = query.toLowerCase().trim();

  if (!q) return [];

  return stocks
    .filter((stock) => {
      return (
        stock.code.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q) ||
        stock.engName?.toLowerCase().includes(q)
      );
    })
    .slice(0, 20); // 최대 20개
}
