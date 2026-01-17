/**
 * 주가 API (한국투자증권 OpenAPI + Finnhub)
 *
 * 한국 주식: 한국투자증권 OpenAPI (KIS Developers)
 * 미국 주식: Finnhub API
 *
 * 캐싱 전략:
 * - 시장시간: 5분 캐시
 * - 장외시간: 1시간 캐시
 */

import { createServiceClient } from '@repo/database/server';

export interface StockPrice {
  ticker: string;
  price: number;
  currency: 'KRW' | 'USD';
  change?: number; // 전일 대비
  changePercent?: number; // 등락률 (%)
  timestamp: number;
  source: string;
}

interface PriceCache {
  price: number;
  change?: number;
  changePercent?: number;
  timestamp: number;
  source: string;
}

// 메모리 캐시
const priceCache = new Map<string, PriceCache>();

// 캐시 유효 시간
const MARKET_HOURS_CACHE_MS = 5 * 60 * 1000; // 5분
const OFF_HOURS_CACHE_MS = 60 * 60 * 1000; // 1시간

// ============================================
// 한국투자증권 OpenAPI (KIS)
// ============================================

const KIS_BASE_URL = 'https://openapi.koreainvestment.com:9443';

interface KISTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface KISPriceResponse {
  rt_cd: string; // 성공시 "0"
  msg_cd: string;
  msg1: string;
  output: {
    stck_prpr: string; // 현재가
    prdy_vrss: string; // 전일 대비
    prdy_ctrt: string; // 등락률
    stck_oprc: string; // 시가
    stck_hgpr: string; // 고가
    stck_lwpr: string; // 저가
    acml_vol: string; // 거래량
    acml_tr_pbmn: string; // 거래대금
  };
}

let kisAccessToken: string | null = null;
let kisTokenExpiry: number = 0;

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
    console.warn('[KIS] APP_KEY or APP_SECRET not configured');
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
      console.error('[KIS] Token request failed:', response.status);
      return null;
    }

    const data: KISTokenResponse = await response.json();
    kisAccessToken = data.access_token;
    kisTokenExpiry = Date.now() + data.expires_in * 1000;

    console.log('[KIS] Token acquired, expires in', data.expires_in, 'seconds');
    return kisAccessToken;
  } catch (error) {
    console.error('[KIS] Token error:', error);
    return null;
  }
}

/**
 * KIS API로 한국 주식 현재가 조회
 */
async function fetchKISPrice(ticker: string): Promise<StockPrice | null> {
  const token = await getKISToken();
  if (!token) return null;

  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) return null;

  try {
    // 종목코드 정리 (6자리로)
    const code = ticker.replace(/^KR/, '').padStart(6, '0');

    const response = await fetch(
      `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${code}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          authorization: `Bearer ${token}`,
          appkey: appKey,
          appsecret: appSecret,
          tr_id: 'FHKST01010100', // 주식현재가 시세 조회
        },
      }
    );

    if (!response.ok) {
      console.error('[KIS] Price request failed:', response.status);
      return null;
    }

    const data: KISPriceResponse = await response.json();

    if (data.rt_cd !== '0') {
      console.error('[KIS] API error:', data.msg1);
      return null;
    }

    const price = parseFloat(data.output.stck_prpr) || 0;
    const change = parseFloat(data.output.prdy_vrss) || 0;
    const changePercent = parseFloat(data.output.prdy_ctrt) || 0;

    return {
      ticker,
      price,
      currency: 'KRW',
      change,
      changePercent,
      timestamp: Date.now(),
      source: 'kis',
    };
  } catch (error) {
    console.error('[KIS] Fetch error:', error);
    return null;
  }
}

// ============================================
// Finnhub API (미국 주식)
// ============================================

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

/**
 * Finnhub API로 미국 주식 현재가 조회
 */
async function fetchFinnhubPrice(ticker: string): Promise<StockPrice | null> {
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    console.warn('[Finnhub] API_KEY not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${ticker}&token=${apiKey}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 }, // 5분 캐시
      }
    );

    if (!response.ok) {
      console.error('[Finnhub] Request failed:', response.status);
      return null;
    }

    const data: FinnhubQuoteResponse = await response.json();

    // c가 0이면 유효하지 않은 심볼
    if (!data.c || data.c === 0) {
      console.warn('[Finnhub] Invalid or no data for', ticker);
      return null;
    }

    return {
      ticker,
      price: data.c,
      currency: 'USD',
      change: data.d,
      changePercent: data.dp,
      timestamp: data.t * 1000,
      source: 'finnhub',
    };
  } catch (error) {
    console.error('[Finnhub] Fetch error:', error);
    return null;
  }
}

// ============================================
// 통합 API
// ============================================

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
    // 섬머타임 고려하지 않음 (대략적인 판단)
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
 * 캐시에서 가격 조회
 */
function getFromCache(ticker: string): StockPrice | null {
  const cached = priceCache.get(ticker);
  if (!cached) return null;

  // 시장 판단
  const market = isKoreanStock(ticker) ? 'KR' : 'US';
  const cacheDuration = getCacheDuration(market);

  if (Date.now() - cached.timestamp > cacheDuration) {
    return null; // 캐시 만료
  }

  return {
    ticker,
    price: cached.price,
    currency: market === 'KR' ? 'KRW' : 'USD',
    change: cached.change,
    changePercent: cached.changePercent,
    timestamp: cached.timestamp,
    source: cached.source,
  };
}

/**
 * 캐시에 가격 저장
 */
function saveToCache(data: StockPrice): void {
  priceCache.set(data.ticker, {
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    timestamp: data.timestamp,
    source: data.source,
  });
}

/**
 * 한국 주식인지 판단
 */
export function isKoreanStock(ticker: string): boolean {
  // 6자리 숫자이거나 KR로 시작하면 한국 주식
  const code = ticker.replace(/^KR/, '');
  return /^\d{6}$/.test(code);
}

/**
 * 단일 종목 현재가 조회
 */
export async function getStockPrice(ticker: string): Promise<StockPrice | null> {
  // 1. 캐시 확인
  const cached = getFromCache(ticker);
  if (cached) {
    console.log(`[StockPrice] Cache hit: ${ticker} = ${cached.price}`);
    return cached;
  }

  // 2. API 호출
  let result: StockPrice | null = null;

  if (isKoreanStock(ticker)) {
    result = await fetchKISPrice(ticker);
  } else {
    result = await fetchFinnhubPrice(ticker);
  }

  // 3. 캐시 저장
  if (result) {
    saveToCache(result);
    console.log(`[StockPrice] Fetched: ${ticker} = ${result.price} (${result.source})`);
  }

  return result;
}

/**
 * 여러 종목 현재가 조회 (병렬 처리)
 */
export async function getStockPrices(
  tickers: string[]
): Promise<Map<string, StockPrice>> {
  const results = new Map<string, StockPrice>();

  // 캐시 확인 및 API 호출 필요한 종목 분류
  const needFetch: string[] = [];

  for (const ticker of tickers) {
    const cached = getFromCache(ticker);
    if (cached) {
      results.set(ticker, cached);
    } else {
      needFetch.push(ticker);
    }
  }

  if (needFetch.length === 0) {
    return results;
  }

  console.log(`[StockPrice] Fetching ${needFetch.length} prices...`);

  // 병렬로 조회 (Rate limit 고려하여 청크 단위로)
  const CHUNK_SIZE = 10;
  for (let i = 0; i < needFetch.length; i += CHUNK_SIZE) {
    const chunk = needFetch.slice(i, i + CHUNK_SIZE);
    const promises = chunk.map((ticker) => getStockPrice(ticker));
    const chunkResults = await Promise.allSettled(promises);

    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j];
      const ticker = chunk[j];
      if (result && ticker && result.status === 'fulfilled' && result.value) {
        results.set(ticker, result.value);
      }
    }

    // Rate limit 방지를 위한 딜레이 (청크 사이)
    if (i + CHUNK_SIZE < needFetch.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * DB의 portfolio_cache 테이블에 현재가 업데이트
 */
export async function updatePortfolioCachePrices(
  userId: string
): Promise<void> {
  const supabase = createServiceClient();

  // 사용자의 보유종목 조회
  const { data: holdings } = await supabase
    .from('holdings')
    .select('ticker, currency')
    .eq('user_id', userId);

  if (!holdings || holdings.length === 0) {
    console.log('[StockPrice] No holdings to update');
    return;
  }

  const tickers = holdings.map((h) => h.ticker);
  const prices = await getStockPrices(tickers);

  // portfolio_cache 업데이트
  const updates = [];
  for (const holding of holdings) {
    const price = prices.get(holding.ticker);
    if (price) {
      updates.push({
        user_id: userId,
        ticker: holding.ticker,
        current_price: price.price,
        currency: price.currency,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (updates.length > 0) {
    await supabase
      .from('portfolio_cache')
      .upsert(updates, { onConflict: 'user_id,ticker' });

    console.log(`[StockPrice] Updated ${updates.length} prices in cache`);
  }
}

/**
 * 캐시 초기화
 */
export function clearPriceCache(): void {
  priceCache.clear();
  console.log('[StockPrice] Cache cleared');
}

/**
 * 캐시 상태 조회
 */
export function getPriceCacheStats(): {
  size: number;
  entries: Array<{ ticker: string; price: number; age: number }>;
} {
  const now = Date.now();
  const entries = Array.from(priceCache.entries()).map(([ticker, cache]) => ({
    ticker,
    price: cache.price,
    age: Math.round((now - cache.timestamp) / 1000), // 초 단위
  }));

  return {
    size: priceCache.size,
    entries,
  };
}
