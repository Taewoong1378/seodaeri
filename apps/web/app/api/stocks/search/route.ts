import { type NextRequest, NextResponse } from 'next/server';
import { type KRXStock, fetchAllStocks, searchStocks } from '../../../../lib/krx-api';

// 종목 리스트 캐시 (메모리)
let stocksCache: KRXStock[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1시간

/**
 * 종목 검색 API
 * GET /api/stocks/search?q=삼성
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  if (!query || query.length < 1) {
    return NextResponse.json({ stocks: [] });
  }

  try {
    // 캐시 확인
    const now = Date.now();
    if (stocksCache.length === 0 || now - cacheTimestamp > CACHE_DURATION) {
      console.log('[stocks/search] Fetching stocks from KRX API...');
      stocksCache = await fetchAllStocks();
      cacheTimestamp = now;
      console.log(`[stocks/search] Cached ${stocksCache.length} stocks`);
    }

    // 검색
    const results = searchStocks(stocksCache, query);

    return NextResponse.json({
      stocks: results.map((stock) => ({
        code: stock.code,
        name: stock.name,
        market: stock.market,
      })),
    });
  } catch (error) {
    console.error('[stocks/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search stocks', stocks: [] },
      { status: 500 }
    );
  }
}
