"use server";

import { createServiceClient } from "@repo/database/server";
import { type KRXStock, fetchAllStocks } from "../../lib/krx-api";
import { type USStock, fetchUSStocks } from "../../lib/us-stocks-api";

export interface SyncStocksResult {
  success: boolean;
  message: string;
  count?: number;
  error?: string;
}

/**
 * KRX API에서 종목 데이터를 가져와 Supabase에 동기화
 * - 관리자 또는 CRON job에서 호출
 * - 장 마감 후 (오후 6시 이후) 실행 권장
 */
export async function syncStocksFromKRX(): Promise<SyncStocksResult> {
  const supabase = createServiceClient();

  try {
    console.log("[syncStocks] Fetching stocks from KRX API...");

    // KRX API에서 종목 데이터 가져오기
    const krxStocks = await fetchAllStocks();

    if (krxStocks.length === 0) {
      return {
        success: false,
        message: "KRX API에서 종목 데이터를 가져오지 못했습니다.",
        error: "No data from KRX API",
      };
    }

    console.log(`[syncStocks] Fetched ${krxStocks.length} stocks from KRX`);

    // Supabase에 upsert (배치로 처리)
    const batchSize = 500;
    let totalUpserted = 0;

    for (let i = 0; i < krxStocks.length; i += batchSize) {
      const batch = krxStocks.slice(i, i + batchSize);

      const stocksToUpsert = batch.map((stock: KRXStock) => ({
        code: stock.code,
        name: stock.name,
        full_code: stock.fullCode,
        market: stock.market,
        eng_name: stock.engName || null,
        country: "KR", // 한국 종목
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("stocks").upsert(stocksToUpsert, {
        onConflict: "code",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("[syncStocks] Batch upsert error:", error);
        throw error;
      }

      totalUpserted += batch.length;
      console.log(
        `[syncStocks] Upserted batch ${
          Math.floor(i / batchSize) + 1
        }, total: ${totalUpserted}`
      );
    }

    // 동기화 메타데이터 업데이트
    const { error: metaError } = await supabase.from("sync_metadata").upsert(
      {
        key: "stocks_last_sync",
        value: {
          timestamp: new Date().toISOString(),
          count: totalUpserted,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "key",
      }
    );

    if (metaError) {
      console.error("[syncStocks] Metadata update error:", metaError);
    }

    return {
      success: true,
      message: `${totalUpserted}개 종목 동기화 완료`,
      count: totalUpserted,
    };
  } catch (error) {
    console.error("[syncStocks] Error:", error);
    return {
      success: false,
      message: "종목 동기화 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * NASDAQ CSV 파일에서 미국 종목 데이터를 가져와 Supabase에 동기화
 * - 관리자 전용
 * - NASDAQ, NYSE, AMEX 종목 저장
 * - CSV 파일 위치: apps/web/data/nasdaq.csv, nyse.csv, amex.csv
 */
export async function syncUSStocks(): Promise<SyncStocksResult> {
  const supabase = createServiceClient();

  try {
    console.log("[syncUSStocks] Loading stocks from CSV files...");

    // CSV 파일에서 미국 종목 데이터 로드
    const usStocks = await fetchUSStocks();

    if (usStocks.length === 0) {
      return {
        success: false,
        message:
          "CSV 파일에서 종목 데이터를 로드하지 못했습니다. data/ 폴더에 CSV 파일이 있는지 확인해주세요.",
        error: "No data from CSV files",
      };
    }

    console.log(`[syncUSStocks] Loaded ${usStocks.length} stocks from CSV`);

    // Supabase에 upsert (배치로 처리)
    const batchSize = 500;
    let totalUpserted = 0;

    for (let i = 0; i < usStocks.length; i += batchSize) {
      const batch = usStocks.slice(i, i + batchSize);

      const stocksToUpsert = batch.map((stock: USStock) => ({
        code: stock.code,
        name: stock.name,
        full_code: stock.code, // 미국 주식은 티커가 곧 코드
        market: stock.market,
        eng_name: stock.name, // 영문명 = 종목명
        country: "US", // 미국 종목
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("stocks").upsert(stocksToUpsert, {
        onConflict: "code",
        ignoreDuplicates: false,
      });

      if (error) {
        console.error("[syncUSStocks] Batch upsert error:", error);
        throw error;
      }

      totalUpserted += batch.length;
      console.log(
        `[syncUSStocks] Upserted batch ${
          Math.floor(i / batchSize) + 1
        }, total: ${totalUpserted}`
      );
    }

    // 동기화 메타데이터 업데이트
    const { error: metaError } = await supabase.from("sync_metadata").upsert(
      {
        key: "us_stocks_last_sync",
        value: {
          timestamp: new Date().toISOString(),
          count: totalUpserted,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "key",
      }
    );

    if (metaError) {
      console.error("[syncUSStocks] Metadata update error:", metaError);
    }

    return {
      success: true,
      message: `${totalUpserted}개 미국 종목 동기화 완료`,
      count: totalUpserted,
    };
  } catch (error) {
    console.error("[syncUSStocks] Error:", error);
    return {
      success: false,
      message: "미국 종목 동기화 중 오류가 발생했습니다.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 마지막 미국 종목 동기화 시간 조회
 */
export async function getUSStocksLastSyncTime(): Promise<{
  timestamp: string | null;
  count: number | null;
}> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from("sync_metadata")
      .select("value")
      .eq("key", "us_stocks_last_sync")
      .single();

    if (error || !data) {
      return { timestamp: null, count: null };
    }

    const value = data.value as { timestamp: string; count: number } | null;
    return {
      timestamp: value?.timestamp || null,
      count: value?.count || null,
    };
  } catch {
    return { timestamp: null, count: null };
  }
}

/**
 * 국가별 종목 개수 조회
 */
export async function getStocksCountByMarket(): Promise<{
  kr: number;
  us: number;
  total: number;
}> {
  const supabase = createServiceClient();

  try {
    // 한국 종목 - 타입 추론 깊이 문제 회피를 위해 as any 사용
    const krResult = await (supabase
      .from("stocks")
      .select("*", { count: "exact", head: true }) as any)
      .eq("is_active", true)
      .eq("country", "KR");
    const krCount: number = krResult?.count || 0;

    // 미국 종목
    const usResult = await (supabase
      .from("stocks")
      .select("*", { count: "exact", head: true }) as any)
      .eq("is_active", true)
      .eq("country", "US");
    const usCount: number = usResult?.count || 0;

    return {
      kr: krCount,
      us: usCount,
      total: krCount + usCount,
    };
  } catch {
    return { kr: 0, us: 0, total: 0 };
  }
}

/**
 * Supabase에서 종목 검색
 * - 장 휴일에도 작동
 * - 한글, 영문, 종목코드 검색 지원
 * @param query 검색어
 * @param country 국가 필터 (KR: 한국, US: 미국, undefined: 전체)
 */
export async function searchStocksFromDB(
  query: string,
  country?: "KR" | "US"
): Promise<{
  success: boolean;
  stocks: Array<{
    code: string;
    name: string;
    market: string;
  }>;
  error?: string;
}> {
  if (!query || query.trim().length < 1) {
    return { success: true, stocks: [] };
  }

  const supabase = createServiceClient();
  const q = query.trim();

  try {
    // 쿼리 빌더 - 타입 추론 깊이 문제 회피를 위해 as any 사용
    let queryBuilder = (supabase
      .from("stocks")
      .select("code, name, market") as any)
      .eq("is_active", true);

    // 국가 필터 적용
    if (country) {
      queryBuilder = queryBuilder.eq("country", country);
    }

    // ilike로 부분 일치 검색 (code, name, eng_name)
    const { data, error } = await queryBuilder
      .or(`code.ilike.%${q}%,name.ilike.%${q}%,eng_name.ilike.%${q}%`)
      .order("market", { ascending: true })
      .order("name", { ascending: true })
      .limit(20);

    if (error) {
      console.error("[searchStocks] Error:", error);
      throw error;
    }

    return {
      success: true,
      stocks: data || [],
    };
  } catch (error) {
    console.error("[searchStocks] Error:", error);
    return {
      success: false,
      stocks: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 마지막 동기화 시간 조회
 */
export async function getLastSyncTime(): Promise<{
  timestamp: string | null;
  count: number | null;
}> {
  const supabase = createServiceClient();

  try {
    const { data, error } = await supabase
      .from("sync_metadata")
      .select("value")
      .eq("key", "stocks_last_sync")
      .single();

    if (error || !data) {
      return { timestamp: null, count: null };
    }

    const value = data.value as { timestamp: string; count: number } | null;
    return {
      timestamp: value?.timestamp || null,
      count: value?.count || null,
    };
  } catch {
    return { timestamp: null, count: null };
  }
}

/**
 * 종목 데이터 개수 조회
 */
export async function getStocksCount(): Promise<number> {
  const supabase = createServiceClient();

  try {
    const { count, error } = await supabase
      .from("stocks")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    if (error) {
      console.error("[getStocksCount] Error:", error);
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}
