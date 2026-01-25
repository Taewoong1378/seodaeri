/**
 * 환율 API (한국수출입은행 API 기반)
 * https://www.koreaexim.go.kr/ir/HPHKIR020M01?apino=2&viewtype=C
 *
 * API 제한:
 * - 하루 1,000회 무료 호출
 * - 영업일 11시 이후 데이터 갱신
 *
 * 도메인 변경 (2025.6.25):
 * - 기존: https://www.koreaexim.go.kr/site/program/financial/exchangeJSON
 * - 신규: https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON
 */

import { createServiceClient } from "@repo/database/server";

// 새 도메인 (2025.6.25 이후)
const KOREAEXIM_API_URL =
  "https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON";
// 기존 도메인 (폴백용)
const KOREAEXIM_API_URL_LEGACY =
  "https://www.koreaexim.go.kr/site/program/financial/exchangeJSON";

interface KoreaEximResponse {
  result: number; // 1: 성공, 2: DATA코드 오류, 3: 인증코드 오류, 4: 일일제한횟수 마감
  cur_unit: string; // 통화코드 (예: USD)
  cur_nm: string; // 통화명 (예: 미국 달러)
  ttb: string; // 전신환(송금) 받을때
  tts: string; // 전신환(송금) 보낼때
  deal_bas_r: string; // 매매 기준율
  bkpr: string; // 장부가격
  yy_efee_r: string; // 년환가료율
  ten_dd_efee_r: string; // 10일환가료율
  kftc_deal_bas_r: string; // 서울외국환중개 매매기준율
  kftc_bkpr: string; // 서울외국환중개 장부가격
}

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
  source: string;
}

// 메모리 캐시 (1시간)
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1시간
let memoryCache: ExchangeRateCache | null = null;

/**
 * 날짜 포맷 (YYYYMMDD)
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * 최근 영업일 계산 (주말 제외)
 */
function getRecentBusinessDates(count = 5): string[] {
  const dates: string[] = [];
  const date = new Date();

  // 오전 11시 이전이면 전일부터 시작 (API 갱신 시간)
  if (date.getHours() < 11) {
    date.setDate(date.getDate() - 1);
  }

  while (dates.length < count) {
    const day = date.getDay();
    // 주말 제외
    if (day !== 0 && day !== 6) {
      dates.push(formatDate(date));
    }
    date.setDate(date.getDate() - 1);
  }

  return dates;
}

/**
 * 특정 URL에서 환율 조회
 */
async function fetchFromUrl(
  baseUrl: string,
  apiKey: string,
  searchDate: string
): Promise<number | null> {
  try {
    const url = `${baseUrl}?authkey=${apiKey}&searchdate=${searchDate}&data=AP01`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // 1시간 캐시 (Next.js)
    });

    if (!response.ok) {
      console.error(`[ExchangeRate] HTTP error from ${baseUrl}:`, response.status);
      return null;
    }

    const data: KoreaEximResponse[] = await response.json();

    if (!data || data.length === 0) {
      return null;
    }

    // USD 환율 찾기
    const usdData = data.find((item) => item.cur_unit === "USD");

    if (!usdData) {
      return null;
    }

    // 매매 기준율 파싱 (쉼표 제거)
    const rate = Number.parseFloat(usdData.deal_bas_r.replace(/,/g, ""));

    if (Number.isNaN(rate) || rate <= 0) {
      return null;
    }

    return rate;
  } catch (error) {
    console.error(`[ExchangeRate] Fetch error from ${baseUrl}:`, error);
    return null;
  }
}

/**
 * 한국수출입은행 API에서 환율 조회
 * - 새 도메인(oapi) 시도 후 실패하면 기존 도메인(www) 폴백
 */
async function fetchFromKoreaExim(searchDate: string): Promise<number | null> {
  const apiKey = process.env.KOREAEXIM_API_KEY;

  if (!apiKey) {
    console.warn("[ExchangeRate] KOREAEXIM_API_KEY not set");
    return null;
  }

  console.log(`[ExchangeRate] Fetching from KoreaExim for date ${searchDate}`);

  // 1. 새 도메인 시도 (oapi.koreaexim.go.kr)
  let rate = await fetchFromUrl(KOREAEXIM_API_URL, apiKey, searchDate);
  if (rate) {
    console.log(`[ExchangeRate] USD/KRW rate from new API: ${rate}`);
    return rate;
  }

  // 2. 기존 도메인 폴백 (www.koreaexim.go.kr)
  console.log("[ExchangeRate] Trying legacy API URL...");
  rate = await fetchFromUrl(KOREAEXIM_API_URL_LEGACY, apiKey, searchDate);
  if (rate) {
    console.log(`[ExchangeRate] USD/KRW rate from legacy API: ${rate}`);
    return rate;
  }

  console.log(`[ExchangeRate] No data for date ${searchDate}`);
  return null;
}

/**
 * Fallback: 고정 환율 사용 (API 실패 시)
 */
function getFallbackRate(): number {
  // 최근 평균 환율 (업데이트 필요 시 수정)
  const FALLBACK_RATE = 1350;
  console.warn(`[ExchangeRate] Using fallback rate: ${FALLBACK_RATE}`);
  return FALLBACK_RATE;
}

/**
 * DB에서 캐시된 환율 조회 (sync_metadata 테이블 사용)
 */
async function getFromDBCache(): Promise<ExchangeRateCache | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("sync_metadata")
      .select("value, updated_at")
      .eq("key", "usd_krw_rate")
      .single();

    if (error || !data) return null;

    const value = data.value as { rate: number; source: string };
    return {
      rate: value.rate,
      source: value.source,
      timestamp: new Date(data.updated_at).getTime(),
    };
  } catch {
    return null;
  }
}

/**
 * DB에 환율 캐시 저장 (sync_metadata 테이블 사용)
 */
async function saveToDBCache(rate: number, source: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("sync_metadata").upsert(
      {
        key: "usd_krw_rate",
        value: { rate, source },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  } catch (error) {
    console.error("[ExchangeRate] Failed to save to DB cache:", error);
  }
}

/**
 * USD → KRW 환율 조회
 * 1. 메모리 캐시 확인
 * 2. DB 캐시 확인
 * 3. 한국수출입은행 API 호출
 * 4. Fallback 사용
 */
export async function getUSDKRWRate(): Promise<number> {
  // 1. 메모리 캐시 확인
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
    console.log(`[ExchangeRate] Using memory cache: ${memoryCache.rate}`);
    return memoryCache.rate;
  }

  // 2. DB 캐시 확인
  const dbCache = await getFromDBCache();
  if (dbCache && Date.now() - dbCache.timestamp < CACHE_DURATION_MS) {
    console.log(`[ExchangeRate] Using DB cache: ${dbCache.rate}`);
    memoryCache = dbCache;
    return dbCache.rate;
  }

  // 3. 한국수출입은행 API 호출 (여러 날짜 시도)
  const dates = getRecentBusinessDates(5);

  for (const date of dates) {
    const rate = await fetchFromKoreaExim(date);
    if (rate) {
      const cache: ExchangeRateCache = {
        rate,
        timestamp: Date.now(),
        source: "koreaexim",
      };
      memoryCache = cache;
      await saveToDBCache(rate, "koreaexim");
      return rate;
    }
  }

  // 4. Fallback
  const fallbackRate = getFallbackRate();

  // DB 캐시가 있으면 (오래되더라도) 그걸 사용
  if (dbCache) {
    console.log(`[ExchangeRate] Using stale DB cache: ${dbCache.rate}`);
    return dbCache.rate;
  }

  return fallbackRate;
}

/**
 * 환율 정보 상세 조회 (캐시 상태 포함)
 */
export async function getExchangeRateInfo(): Promise<{
  rate: number;
  source: string;
  timestamp: number;
  isStale: boolean;
}> {
  // 메모리 캐시 확인
  const cachedData = memoryCache;
  if (cachedData) {
    return {
      rate: cachedData.rate,
      source: cachedData.source || "unknown",
      timestamp: cachedData.timestamp,
      isStale: Date.now() - cachedData.timestamp >= CACHE_DURATION_MS,
    };
  }

  // 새로 조회 (memoryCache가 업데이트됨)
  const rate = await getUSDKRWRate();

  // 업데이트된 캐시 참조
  const updatedCache = memoryCache;
  return {
    rate,
    source: updatedCache?.source || "fallback",
    timestamp: updatedCache?.timestamp || Date.now(),
    isStale: false,
  };
}

/**
 * 환율 캐시 강제 갱신
 */
export async function refreshExchangeRate(): Promise<number> {
  memoryCache = null;
  return getUSDKRWRate();
}
