import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@repo/database/server';
import { type KRXStock, fetchAllStocks, searchStocks } from '../../../../lib/krx-api';
import { searchAlternativeAssets } from '../../../../lib/alternative-asset-api';

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
    // 0. 대안 자산(암호화폐/금 등) 검색
    const alternativeMatches = searchAlternativeAssets(q);
    const altStocks = alternativeMatches.map(asset => ({
      code: asset.code,
      name: asset.name,
      market: '기타자산',
    }));

    // 1. Supabase에서 검색 시도
    const supabase = createServiceClient();

    const { data: dbStocks, error: dbError } = await supabase
      .from('stocks')
      .select('code, name, market')
      .eq('is_active', true)
      .or(`code.ilike.%${q}%,name.ilike.%${q}%,eng_name.ilike.%${q}%`)
      .limit(50);

    // Supabase에서 결과를 찾았으면 정렬 후 대안 자산과 합쳐서 반환
    if (!dbError && dbStocks && dbStocks.length > 0) {
      // 정렬: 코드 정확 일치 → 코드가 검색어로 시작 → 개별종목 우선 → 이름순
      const qUpper = q.toUpperCase();
      const sorted = dbStocks.sort((a, b) => {
        const aCode = a.code.toUpperCase();
        const bCode = b.code.toUpperCase();

        // 1) 코드 정확히 일치
        const aExact = aCode === qUpper;
        const bExact = bCode === qUpper;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 2) 코드가 검색어로 시작
        const aStarts = aCode.startsWith(qUpper);
        const bStarts = bCode.startsWith(qUpper);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // 3) 개별종목(비-ETF) 우선
        const aIsEtf = a.market === 'ETF';
        const bIsEtf = b.market === 'ETF';
        if (!aIsEtf && bIsEtf) return -1;
        if (aIsEtf && !bIsEtf) return 1;

        // 4) 이름순
        return a.name.localeCompare(b.name);
      });

      // Deduplicate: remove any Supabase results that match alternative asset codes
      const altCodes = new Set(altStocks.map(a => a.code));
      const filteredDbStocks = sorted.filter(s => !altCodes.has(s.code)).slice(0, 20);

      const combined = [...altStocks, ...filteredDbStocks];
      console.log(`[stocks/search] Found ${combined.length} stocks (${altStocks.length} alternative + ${filteredDbStocks.length} from Supabase)`);
      return NextResponse.json({
        stocks: combined,
        source: 'supabase',
      });
    }

    // 2. Supabase에 데이터가 없으면 stocks 테이블 총 개수 확인
    const { count: totalCount } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    // stocks 테이블에 데이터가 있는데 검색 결과가 없으면 대안 자산만 반환
    if (totalCount && totalCount > 0) {
      if (altStocks.length > 0) {
        return NextResponse.json({
          stocks: altStocks,
          source: 'supabase',
        });
      }
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

    // KRX 캐시에서 검색 후 대안 자산과 합쳐서 반환
    const results = searchStocks(stocksCache, q);
    const krxStocks = results.map((stock) => ({
      code: stock.code,
      name: stock.name,
      market: stock.market,
    }));

    // Deduplicate KRX results against alternative assets
    const altCodes = new Set(altStocks.map(a => a.code));
    const filteredKrxStocks = krxStocks.filter(s => !altCodes.has(s.code));
    const combined = [...altStocks, ...filteredKrxStocks];

    return NextResponse.json({
      stocks: combined,
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
