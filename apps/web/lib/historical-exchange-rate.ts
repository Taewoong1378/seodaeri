/**
 * 월별 USD/KRW 환율 데이터 (구글 스프레드시트 기반)
 *
 * 공개 스프레드시트에서 월별 환율 데이터를 조회하고 캐시합니다.
 * - Column G: 날짜 (YY.MM)
 * - Column H: USD/KRW 환율
 */

import { createServiceClient } from "@repo/database/server";
import { getUSDKRWRate } from "./exchange-rate-api";

const PUBLIC_SPREADSHEET_ID = "1mhRnA1oB2OizL-jRtbBV-b2evYVJooMaVGyWIgQeBMM";

// 메모리 캐시 (24시간)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;
let memoryCache: { data: Map<string, number>; timestamp: number } | null = null;
let marketDataCache: { data: HistoricalMarketData; timestamp: number } | null = null;

interface DBCacheValue {
  rates: Record<string, number>;
}

export interface HistoricalMarketData {
  exchangeRates: Map<string, number>;  // YY.MM → USD/KRW
  gold: Map<string, number>;           // YY.MM → 금 원화환산 가격
  bitcoin: Map<string, number>;        // YY.MM → BTC 원화환산 가격
  realEstate: Map<string, number>;     // YY.MM → 서울 아파트 지수
}

/**
 * 공개 스프레드시트에서 CSV 형식으로 데이터 가져오기
 */
async function fetchFromPublicSpreadsheet(): Promise<Map<string, number>> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${PUBLIC_SPREADSHEET_ID}/export?format=csv`;

  try {
    console.log("[HistoricalExchangeRate] Fetching from public spreadsheet");

    const response = await fetch(csvUrl, {
      next: { revalidate: 86400 }, // 24시간 캐시
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const csvText = await response.text();
    const rates = parseCSVExchangeRates(csvText);

    console.log(`[HistoricalExchangeRate] Fetched ${rates.size} monthly rates`);
    return rates;
  } catch (error) {
    console.error("[HistoricalExchangeRate] Failed to fetch from spreadsheet:", error);
    throw error;
  }
}

/**
 * CSV 행을 따옴표를 고려하여 필드로 분리
 * "1,069.02" 같은 따옴표 안의 쉼표를 필드 구분자로 처리하지 않음
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  return fields;
}

/**
 * CSV 파싱 (Column G = 날짜, Column H = 환율)
 * 스프레드시트는 헤더 2행 + 데이터 행으로 구성
 * 환율 값이 "1,069.02" 형태의 따옴표 포함 가능
 */
function parseCSVExchangeRates(csvText: string): Map<string, number> {
  const rates = new Map<string, number>();
  const lines = csvText.split('\n');

  // 헤더 2행 제외하고 데이터 파싱
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const columns = parseCSVLine(trimmedLine);

    // Column G (index 6) = 날짜, Column H (index 7) = 환율
    const dateStr = columns[6]?.trim();
    const rateStr = columns[7]?.trim();

    if (!dateStr || !rateStr) continue;

    // 날짜 형식 검증: YY.MM (예: "25.01")
    if (!/^\d{2}\.\d{2}$/.test(dateStr)) continue;

    // 환율 파싱 (쉼표, 따옴표 제거)
    const rate = Number.parseFloat(rateStr.replace(/[,"]/g, ""));

    if (Number.isNaN(rate) || rate <= 0) continue;

    rates.set(dateStr, rate);
  }

  return rates;
}

/**
 * CSV 파싱 (모든 시장 데이터)
 * Column G = 날짜, Column H = 환율, Column V = 금, Column W = 비트코인, Column AA = 부동산
 */
function parseCSVMarketData(csvText: string): HistoricalMarketData {
  const exchangeRates = new Map<string, number>();
  const gold = new Map<string, number>();
  const bitcoin = new Map<string, number>();
  const realEstate = new Map<string, number>();
  const lines = csvText.split('\n');

  // 헤더 2행 제외하고 데이터 파싱
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const columns = parseCSVLine(trimmedLine);

    // Column G (index 6) = 날짜
    const dateStr = columns[6]?.trim();
    if (!dateStr || !/^\d{2}\.\d{2}$/.test(dateStr)) continue;

    // Column H (index 7) = USD/KRW 환율
    const rateStr = columns[7]?.trim();
    if (rateStr) {
      const rate = Number.parseFloat(rateStr.replace(/[,"]/g, ""));
      if (!Number.isNaN(rate) && rate > 0) {
        exchangeRates.set(dateStr, rate);
      }
    }

    // Column V (index 21) = 골드 원화환산
    const goldStr = columns[21]?.trim();
    if (goldStr) {
      const goldVal = Number.parseFloat(goldStr.replace(/[,"]/g, ""));
      if (!Number.isNaN(goldVal) && goldVal > 0) {
        gold.set(dateStr, goldVal);
      }
    }

    // Column W (index 22) = 비트코인 원화환산
    const btcStr = columns[22]?.trim();
    if (btcStr) {
      const btcVal = Number.parseFloat(btcStr.replace(/[,"]/g, ""));
      if (!Number.isNaN(btcVal) && btcVal > 0) {
        bitcoin.set(dateStr, btcVal);
      }
    }

    // Column AA (index 26) = 서울 아파트 지수
    const reStr = columns[26]?.trim();
    if (reStr) {
      const reVal = Number.parseFloat(reStr.replace(/[,"]/g, ""));
      if (!Number.isNaN(reVal) && reVal > 0) {
        realEstate.set(dateStr, reVal);
      }
    }
  }

  return { exchangeRates, gold, bitcoin, realEstate };
}

/**
 * 현재 환율로 누락된 최근 월 데이터 보완
 */
async function supplementWithCurrentRate(
  rates: Map<string, number>
): Promise<Map<string, number>> {
  // 원본 보존 (새 Map 생성)
  const supplementedRates = new Map(rates);

  // 최신 환율 가져오기
  let currentRate: number;
  try {
    currentRate = await getUSDKRWRate();
  } catch (error) {
    console.error("[HistoricalExchangeRate] Failed to get current rate:", error);
    return supplementedRates;
  }

  // 현재 월 계산
  const now = new Date();
  const currentMonth = formatYYMM(now);

  // Map에 있는 마지막 월 찾기
  const allMonths = Array.from(rates.keys()).sort();
  const lastMonth = allMonths[allMonths.length - 1];

  if (!lastMonth) {
    // Map이 비어있으면 현재 월만 추가
    supplementedRates.set(currentMonth, currentRate);
    return supplementedRates;
  }

  // 마지막 월부터 현재 월까지 누락된 월 찾기
  const missingMonths = getMissingMonths(lastMonth, currentMonth);

  for (const month of missingMonths) {
    if (!supplementedRates.has(month)) {
      supplementedRates.set(month, currentRate);
    }
  }

  return supplementedRates;
}

/**
 * Date를 YY.MM 형식으로 변환
 */
function formatYYMM(date: Date): string {
  const year = String(date.getFullYear()).slice(-2); // 뒤 2자리
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

/**
 * 두 월(YY.MM) 사이의 누락된 월 목록 생성
 */
function getMissingMonths(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];

  // YY.MM을 Date로 변환
  const startParts = startMonth.split('.').map(Number);
  const endParts = endMonth.split('.').map(Number);

  const startYY = startParts[0] ?? 0;
  const startMM = startParts[1] ?? 1;
  const endYY = endParts[0] ?? 0;
  const endMM = endParts[1] ?? 1;

  const startYear = 2000 + startYY;
  const endYear = 2000 + endYY;

  let currentDate = new Date(startYear, startMM - 1); // Month는 0-indexed
  const endDate = new Date(endYear, endMM - 1);

  while (currentDate <= endDate) {
    months.push(formatYYMM(currentDate));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return months;
}

/**
 * DB에서 캐시된 월별 환율 조회
 */
async function getFromDBCache(): Promise<Map<string, number> | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("sync_metadata")
      .select("value, updated_at")
      .eq("key", "historical_exchange_rates")
      .single();

    if (error || !data || !data.value) return null;

    const value = data.value as unknown as DBCacheValue;
    if (!value.rates || typeof value.rates !== 'object') return null;

    const rates = new Map<string, number>(Object.entries(value.rates));

    console.log(`[HistoricalExchangeRate] DB cache has ${rates.size} rates`);
    return rates;
  } catch (error) {
    console.error("[HistoricalExchangeRate] Failed to get from DB cache:", error);
    return null;
  }
}

/**
 * DB에 월별 환율 캐시 저장
 */
async function saveToDBCache(rates: Map<string, number>): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Map을 Record로 변환
    const ratesRecord: Record<string, number> = {};
    rates.forEach((rate, month) => {
      ratesRecord[month] = rate;
    });

    await supabase.from("sync_metadata").upsert(
      {
        key: "historical_exchange_rates",
        value: { rates: ratesRecord },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    console.log(`[HistoricalExchangeRate] Saved ${rates.size} rates to DB cache`);
  } catch (error) {
    console.error("[HistoricalExchangeRate] Failed to save to DB cache:", error);
  }
}

/**
 * 공개 스프레드시트에서 월별 USD/KRW 환율 데이터 조회
 *
 * @returns Map<string, number> - key: "YY.MM" (예: "25.01"), value: USD/KRW rate (예: 1465.62)
 */
export async function getHistoricalExchangeRates(): Promise<Map<string, number>> {
  // 1. 메모리 캐시 확인
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_DURATION_MS) {
    console.log("[HistoricalExchangeRate] Using memory cache");
    return supplementWithCurrentRate(memoryCache.data);
  }

  // 2. 공개 스프레드시트에서 가져오기 시도
  try {
    const rates = await fetchFromPublicSpreadsheet();
    if (rates.size > 0) {
      memoryCache = { data: rates, timestamp: Date.now() };
      // DB 캐시 저장 (비동기, 실패해도 무시)
      saveToDBCache(rates).catch(() => {});
      return supplementWithCurrentRate(rates);
    }
  } catch (error) {
    console.error("[HistoricalExchangeRate] Fetch from spreadsheet failed:", error);
  }

  // 3. DB 캐시 폴백
  try {
    const dbRates = await getFromDBCache();
    if (dbRates && dbRates.size > 0) {
      console.log("[HistoricalExchangeRate] Using DB cache");
      memoryCache = { data: dbRates, timestamp: Date.now() };
      return supplementWithCurrentRate(dbRates);
    }
  } catch (error) {
    console.error("[HistoricalExchangeRate] DB cache failed:", error);
  }

  // 4. 최종 폴백 - 빈 Map 반환
  console.warn("[HistoricalExchangeRate] No exchange rate data available");
  return new Map();
}

/**
 * 특정 월의 환율 조회
 *
 * @param yearMonth - "YY.MM" 형식 (예: "25.01")
 * @returns USD/KRW 환율 또는 null
 */
export async function getExchangeRateForMonth(
  yearMonth: string
): Promise<number | null> {
  const rates = await getHistoricalExchangeRates();
  return rates.get(yearMonth) || null;
}

/**
 * 환율 캐시 강제 갱신
 */
export async function refreshHistoricalExchangeRates(): Promise<Map<string, number>> {
  memoryCache = null;
  return getHistoricalExchangeRates();
}

/**
 * 공개 스프레드시트에서 모든 시장 데이터 조회
 * (환율, 금, 비트코인, 부동산)
 */
export async function getHistoricalMarketData(): Promise<HistoricalMarketData> {
  // 1. 메모리 캐시 확인
  if (marketDataCache && Date.now() - marketDataCache.timestamp < CACHE_DURATION_MS) {
    console.log("[HistoricalMarketData] Using memory cache");
    return marketDataCache.data;
  }

  // 2. 공개 스프레드시트에서 가져오기
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${PUBLIC_SPREADSHEET_ID}/export?format=csv`;
    const response = await fetch(csvUrl, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const csvText = await response.text();
    const marketData = parseCSVMarketData(csvText);

    console.log(`[HistoricalMarketData] Fetched: rates=${marketData.exchangeRates.size}, gold=${marketData.gold.size}, btc=${marketData.bitcoin.size}, re=${marketData.realEstate.size}`);

    marketDataCache = { data: marketData, timestamp: Date.now() };

    // 기존 환율 메모리 캐시도 업데이트
    memoryCache = { data: marketData.exchangeRates, timestamp: Date.now() };

    return marketData;
  } catch (error) {
    console.error("[HistoricalMarketData] Failed:", error);
  }

  // 3. 폴백 - 빈 데이터
  return {
    exchangeRates: new Map(),
    gold: new Map(),
    bitcoin: new Map(),
    realEstate: new Map(),
  };
}
