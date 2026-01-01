import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@repo/database/server';
import { type KRXStock, fetchAllStocks, searchStocks } from '../../../../lib/krx-api';

// KRX API fallback용 캐시 (Supabase에 데이터가 없을 때만 사용)
let stocksCache: KRXStock[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1시간

/**
 * 종목 검색 API
 * GET /api/stocks/search?q=삼성
 * 
 * 1. 우선 Supabase stocks 테이블에서 검색
 * 2. Supabase에 데이터가 없으면 KRX API에서 직접 검색 (fallback)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  if (!query || query.length < 1) {
    return NextResponse.json({ stocks: [] });
  }

  const q = query.trim();

  try {
    // 1. Supabase에서 검색 시도
    const supabase = createServiceClient();
    
    const { data: dbStocks, error: dbError } = await supabase
      .from('stocks')
      .select('code, name, market')
      .eq('is_active', true)
      .or(`code.ilike.%${q}%,name.ilike.%${q}%,eng_name.ilike.%${q}%`)
      .order('market', { ascending: true })
      .order('name', { ascending: true })
      .limit(20);

    // Supabase에서 결과를 찾았으면 반환
    if (!dbError && dbStocks && dbStocks.length > 0) {
      console.log(`[stocks/search] Found ${dbStocks.length} stocks from Supabase`);
      return NextResponse.json({
        stocks: dbStocks,
        source: 'supabase',
      });
    }

    // 2. Supabase에 데이터가 없으면 stocks 테이블 총 개수 확인
    const { count: totalCount } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    // stocks 테이블에 데이터가 있는데 검색 결과가 없으면 빈 배열 반환
    if (totalCount && totalCount > 0) {
      console.log(`[stocks/search] No match found in Supabase (total: ${totalCount} stocks)`);
      return NextResponse.json({
        stocks: [],
        source: 'supabase',
      });
    }

    // 3. Supabase stocks 테이블이 비어있으면 KRX API fallback
    console.log('[stocks/search] Supabase stocks table is empty, falling back to KRX API');

    const now = Date.now();
    if (stocksCache.length === 0 || now - cacheTimestamp > CACHE_DURATION) {
      console.log('[stocks/search] Fetching stocks from KRX API...');
      try {
        stocksCache = await fetchAllStocks();
        cacheTimestamp = now;
        console.log(`[stocks/search] Cached ${stocksCache.length} stocks from KRX`);
      } catch (krxError) {
        console.error('[stocks/search] KRX API error:', krxError);
        return NextResponse.json({
          error: '종목 검색에 실패했습니다. 장 휴일에는 검색이 제한될 수 있습니다.',
          stocks: [],
          source: 'error',
        });
      }
    }

    // KRX 캐시에서 검색
    const results = searchStocks(stocksCache, q);

    return NextResponse.json({
      stocks: results.map((stock) => ({
        code: stock.code,
        name: stock.name,
        market: stock.market,
      })),
      source: 'krx',
    });
  } catch (error) {
    console.error('[stocks/search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search stocks', stocks: [] },
      { status: 500 }
    );
  }
}
