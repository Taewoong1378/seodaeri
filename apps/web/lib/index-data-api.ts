/**
 * 지수 데이터 API (한국투자증권 OpenAPI 통합)
 *
 * - KOSPI: 업종지수 API (tr_id: FHPUP02100000)
 * - S&P500: SPY ETF 가격 (tr_id: HHDFS00000300)
 * - NASDAQ: QQQ ETF 가격 (tr_id: HHDFS00000300)
 *
 * 캐싱 전략:
 * - 시장시간: 5분 캐시
 * - 장외시간: 1시간 캐시
 */

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

// 캐시 유효 시간
const MARKET_HOURS_CACHE_MS = 5 * 60 * 1000; // 5분
const OFF_HOURS_CACHE_MS = 60 * 60 * 1000; // 1시간

export interface IndexData {
  name: string;
  code: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  source: string;
}

interface IndexCache {
  data: IndexData;
  timestamp: number;
}

// 메모리 캐시
const indexCache = new Map<string, IndexCache>();

// KIS 토큰 관리 (stock-price-api.ts와 공유)
let kisAccessToken: string | null = null;
let kisTokenExpiry: number = 0;

interface KISTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface KISIndexPriceResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: {
    bstp_nmix_prpr: string; // 업종 지수 현재가
    bstp_nmix_prdy_vrss: string; // 전일 대비
    prdy_vrss_sign: string; // 전일 대비 부호
    bstp_nmix_prdy_ctrt: string; // 등락률
    acml_vol: string; // 거래량
    bstp_nmix_oprc: string; // 시가
    bstp_nmix_hgpr: string; // 고가
    bstp_nmix_lwpr: string; // 저가
  };
}

interface KISOverseasPriceResponse {
  rt_cd: string;
  msg_cd: string;
  msg1: string;
  output: {
    rsym: string;
    zdiv: string;
    base: string;
    pvol: string;
    last: string;
    sign: string;
    diff: string;
    rate: string;
    tvol: string;
    tamt: string;
    ordy: string;
  };
}

/**
 * KIS API 인증 토큰 발급
 */
async function getKISToken(): Promise<string | null> {
  // 토큰이 유효하면 재사용
  if (kisAccessToken && Date.now() < kisTokenExpiry - 60000) {
    return kisAccessToken;
  }

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) {
    console.warn('[KIS-Index] APP_KEY or APP_SECRET not configured');
    return null;
  }

  try {
    const response = await fetch(`${KIS_BASE_URL}/oauth2/tokenP`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'No body');
      console.warn('[KIS-Index] Token request failed:', response.status, '-', errorBody);
      console.warn('[KIS-Index] App Key/Secret을 확인하거나 KIS Developers에서 앱 상태를 확인하세요.');
      return null;
    }

    const data: KISTokenResponse = await response.json();
    kisAccessToken = data.access_token;
    kisTokenExpiry = Date.now() + data.expires_in * 1000;

    console.log('[KIS-Index] Token acquired, expires in', data.expires_in, 'seconds');
    return kisAccessToken;
  } catch (error) {
    console.error('[KIS-Index] Token error:', error);
    return null;
  }
}

/**
 * 시장 운영 시간인지 확인
 */
function isMarketHours(market: 'KR' | 'US'): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDay();

  // 주말은 장 마감
  if (day === 0 || day === 6) return false;

  if (market === 'KR') {
    // 한국 시장: 09:00 ~ 15:30 (KST)
    const time = hours * 100 + minutes;
    return time >= 900 && time <= 1530;
  } else {
    // 미국 시장: 22:30 ~ 05:00 (KST, 다음날)
    const time = hours * 100 + minutes;
    return time >= 2230 || time <= 500;
  }
}

/**
 * 캐시 유효 시간 결정
 */
function getCacheDuration(market: 'KR' | 'US'): number {
  return isMarketHours(market) ? MARKET_HOURS_CACHE_MS : OFF_HOURS_CACHE_MS;
}

/**
 * 캐시에서 조회
 */
function getFromCache(code: string, market: 'KR' | 'US'): IndexData | null {
  const cached = indexCache.get(code);
  if (!cached) return null;

  const cacheDuration = getCacheDuration(market);
  if (Date.now() - cached.timestamp > cacheDuration) {
    return null; // 캐시 만료
  }

  return cached.data;
}

/**
 * 캐시에 저장
 */
function saveToCache(code: string, data: IndexData): void {
  indexCache.set(code, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * KOSPI 지수 조회
 */
export async function getKOSPIIndex(): Promise<IndexData | null> {
  const cached = getFromCache('KOSPI', 'KR');
  if (cached) {
    console.log('[Index] Cache hit: KOSPI =', cached.price);
    return cached;
  }

  const token = await getKISToken();
  if (!token) return null;

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) return null;

  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=0001`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: 'FHPUP02100000',
          custtype: 'P',
        },
      }
    );

    if (!response.ok) {
      console.error('[Index] KOSPI request failed:', response.status);
      return null;
    }

    const data: KISIndexPriceResponse = await response.json();

    if (data.rt_cd !== '0') {
      console.error('[Index] KOSPI API error:', data.msg1);
      return null;
    }

    const result: IndexData = {
      name: 'KOSPI',
      code: '0001',
      price: parseFloat(data.output.bstp_nmix_prpr) || 0,
      change: parseFloat(data.output.bstp_nmix_prdy_vrss) || 0,
      changePercent: parseFloat(data.output.bstp_nmix_prdy_ctrt) || 0,
      timestamp: Date.now(),
      source: 'kis-index',
    };

    saveToCache('KOSPI', result);
    console.log('[Index] Fetched KOSPI:', result.price);

    return result;
  } catch (error) {
    console.error('[Index] KOSPI fetch error:', error);
    return null;
  }
}

/**
 * KOSDAQ 지수 조회
 */
export async function getKOSDAQIndex(): Promise<IndexData | null> {
  const cached = getFromCache('KOSDAQ', 'KR');
  if (cached) {
    console.log('[Index] Cache hit: KOSDAQ =', cached.price);
    return cached;
  }

  const token = await getKISToken();
  if (!token) return null;

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) return null;

  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-index-price?FID_COND_MRKT_DIV_CODE=U&FID_INPUT_ISCD=1001`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: 'FHPUP02100000',
          custtype: 'P',
        },
      }
    );

    if (!response.ok) {
      console.error('[Index] KOSDAQ request failed:', response.status);
      return null;
    }

    const data: KISIndexPriceResponse = await response.json();

    if (data.rt_cd !== '0') {
      console.error('[Index] KOSDAQ API error:', data.msg1);
      return null;
    }

    const result: IndexData = {
      name: 'KOSDAQ',
      code: '1001',
      price: parseFloat(data.output.bstp_nmix_prpr) || 0,
      change: parseFloat(data.output.bstp_nmix_prdy_vrss) || 0,
      changePercent: parseFloat(data.output.bstp_nmix_prdy_ctrt) || 0,
      timestamp: Date.now(),
      source: 'kis-index',
    };

    saveToCache('KOSDAQ', result);
    console.log('[Index] Fetched KOSDAQ:', result.price);

    return result;
  } catch (error) {
    console.error('[Index] KOSDAQ fetch error:', error);
    return null;
  }
}

/**
 * S&P500 지수 조회 (SPY ETF 기반)
 */
export async function getSP500Index(): Promise<IndexData | null> {
  const cached = getFromCache('SP500', 'US');
  if (cached) {
    console.log('[Index] Cache hit: S&P500 =', cached.price);
    return cached;
  }

  const token = await getKISToken();
  if (!token) return null;

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) return null;

  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=AMS&SYMB=SPY`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: 'HHDFS00000300',
          custtype: 'P',
        },
      }
    );

    if (!response.ok) {
      console.error('[Index] S&P500 request failed:', response.status);
      return null;
    }

    const data: KISOverseasPriceResponse = await response.json();

    if (data.rt_cd !== '0') {
      console.error('[Index] S&P500 API error:', data.msg1);
      return null;
    }

    const price = parseFloat(data.output.last) || 0;
    if (price === 0) {
      console.warn('[Index] S&P500 empty response');
      return null;
    }

    const result: IndexData = {
      name: 'S&P500',
      code: 'SPY',
      price,
      change: parseFloat(data.output.diff) || 0,
      changePercent: parseFloat(data.output.rate) || 0,
      timestamp: Date.now(),
      source: 'kis-etf',
    };

    saveToCache('SP500', result);
    console.log('[Index] Fetched S&P500 (SPY):', result.price);

    return result;
  } catch (error) {
    console.error('[Index] S&P500 fetch error:', error);
    return null;
  }
}

/**
 * NASDAQ 지수 조회 (QQQ ETF 기반)
 */
export async function getNASDAQIndex(): Promise<IndexData | null> {
  const cached = getFromCache('NASDAQ', 'US');
  if (cached) {
    console.log('[Index] Cache hit: NASDAQ =', cached.price);
    return cached;
  }

  const token = await getKISToken();
  if (!token) return null;

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) return null;

  try {
    const response = await fetch(
      `${KIS_BASE_URL}/uapi/overseas-price/v1/quotations/price?AUTH=&EXCD=NAS&SYMB=QQQ`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: 'HHDFS00000300',
          custtype: 'P',
        },
      }
    );

    if (!response.ok) {
      console.error('[Index] NASDAQ request failed:', response.status);
      return null;
    }

    const data: KISOverseasPriceResponse = await response.json();

    if (data.rt_cd !== '0') {
      console.error('[Index] NASDAQ API error:', data.msg1);
      return null;
    }

    const price = parseFloat(data.output.last) || 0;
    if (price === 0) {
      console.warn('[Index] NASDAQ empty response');
      return null;
    }

    const result: IndexData = {
      name: 'NASDAQ',
      code: 'QQQ',
      price,
      change: parseFloat(data.output.diff) || 0,
      changePercent: parseFloat(data.output.rate) || 0,
      timestamp: Date.now(),
      source: 'kis-etf',
    };

    saveToCache('NASDAQ', result);
    console.log('[Index] Fetched NASDAQ (QQQ):', result.price);

    return result;
  } catch (error) {
    console.error('[Index] NASDAQ fetch error:', error);
    return null;
  }
}

/**
 * 모든 주요 지수 조회
 */
export async function getAllMajorIndices(): Promise<{
  kospi: IndexData | null;
  kosdaq: IndexData | null;
  sp500: IndexData | null;
  nasdaq: IndexData | null;
}> {
  const [kospi, kosdaq, sp500, nasdaq] = await Promise.all([
    getKOSPIIndex(),
    getKOSDAQIndex(),
    getSP500Index(),
    getNASDAQIndex(),
  ]);

  return { kospi, kosdaq, sp500, nasdaq };
}

/**
 * 지수 캐시 초기화
 */
export function clearIndexCache(): void {
  indexCache.clear();
  console.log('[Index] Cache cleared');
}

/**
 * 지수 캐시 상태 조회
 */
export function getIndexCacheStats(): {
  size: number;
  entries: Array<{ code: string; price: number; age: number }>;
} {
  const now = Date.now();
  const entries = Array.from(indexCache.entries()).map(([code, cache]) => ({
    code,
    price: cache.data.price,
    age: Math.round((now - cache.timestamp) / 1000),
  }));

  return {
    size: indexCache.size,
    entries,
  };
}
