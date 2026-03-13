import { createServiceClient } from '@repo/database/server'
import { type NextRequest, NextResponse } from 'next/server'
import { searchAlternativeAssets } from '../../../../lib/alternative-asset-api'
import { type KRXStock, fetchAllStocks, searchStocks } from '../../../../lib/krx-api'

// KRX API fallback용 캐시 (Supabase에 데이터가 없을 때만 사용)
let stocksCache: KRXStock[] = []
let cacheTimestamp = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1시간

/**
 * 종목 검색 API
 * GET /api/stocks/search?q=삼성
 *
 * 1. 우선 Supabase stocks 테이블에서 검색
 * 2. Supabase에 데이터가 없으면 KRX API에서 직접 검색 (fallback)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q') || ''

  if (!query || query.length < 1) {
    return NextResponse.json({ stocks: [] })
  }

  const q = query.trim()

  try {
    // 0. 대안 자산(암호화폐/금 등) 검색
    const alternativeMatches = searchAlternativeAssets(q)
    const altStocks = alternativeMatches.map((asset) => ({
      code: asset.code,
      name: asset.name,
      market: '기타자산',
    }))

    // 1. Supabase에서 검색 시도
    const supabase = createServiceClient()

    // 다중 단어 검색: 각 토큰이 code/name/eng_name 중 하나에 포함되어야 함 (AND)
    // 예: "tiger 미국" → name ILIKE '%tiger%' AND name ILIKE '%미국%'
    const tokens = q.split(/\s+/).filter((t) => t.length > 0)

    // Supabase 쿼리 빌드: 각 토큰별 .or()를 체이닝하면 AND로 동작
    let query = supabase
      .from('stocks')
      .select('code, name, market, eng_name')
      .eq('is_active', true)

    for (const token of tokens) {
      query = query.or(
        `code.ilike.%${token}%,name.ilike.%${token}%,eng_name.ilike.%${token}%`,
      )
    }

    const { data: dbStocks, error: dbError } = await query.limit(200)

    // Supabase에서 결과를 찾았으면 토큰 필터 → 정렬 → 반환
    if (!dbError && dbStocks && dbStocks.length > 0) {
      // 나머지 토큰으로 AND 필터 (모든 토큰이 code/name/eng_name 중 하나에 포함되어야 함)
      const filtered =
        tokens.length > 1
          ? dbStocks.filter((stock) => {
              const searchText =
                `${stock.code} ${stock.name} ${stock.eng_name || ''}`.toLowerCase()
              return tokens.every((token) => searchText.includes(token.toLowerCase()))
            })
          : dbStocks

      // 국내 ETF 브랜드 패턴 (검색어가 브랜드명과 일치하면 해당 ETF 우선 표시)
      const ETF_BRANDS = [
        'KODEX', 'TIGER', 'KBSTAR', 'SOL', 'ACE', 'HANARO', 'ARIRANG',
        'KOSEF', 'TIMEFOLIO', 'PLUS', 'RISE', 'FOCUS',
      ]
      const isKrMarket = (market: string) =>
        market === 'KOSPI' || market === 'KOSDAQ' || market === 'ETF'
      // 검색어의 첫 토큰이 ETF 브랜드인지 확인
      const firstToken = tokens[0]?.toUpperCase() ?? ''
      const isEtfBrandSearch = ETF_BRANDS.includes(firstToken)

      // 정렬: ETF 브랜드 검색 시 국내 ETF 우선 → 코드 정확 일치 → 이름 시작 일치 → 코드 시작 일치 → 이름순
      const qLower = q.toLowerCase()
      const qUpper = q.toUpperCase()
      const sorted = filtered.sort((a, b) => {
        const aCode = a.code.toUpperCase()
        const bCode = b.code.toUpperCase()
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()

        // 0) ETF 브랜드 검색: 해당 브랜드의 국내 ETF를 최우선
        if (isEtfBrandSearch) {
          const aIsEtf = isKrMarket(a.market) && a.name.toUpperCase().startsWith(firstToken)
          const bIsEtf = isKrMarket(b.market) && b.name.toUpperCase().startsWith(firstToken)
          if (aIsEtf && !bIsEtf) return -1
          if (!aIsEtf && bIsEtf) return 1
        }

        // 1) 코드 정확히 일치
        const aExact = aCode === qUpper
        const bExact = bCode === qUpper
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        // 2) 이름이 검색어로 시작 (예: "sol" → "SOL 미국배당" 우선)
        const aNameStarts = aName.startsWith(qLower)
        const bNameStarts = bName.startsWith(qLower)
        if (aNameStarts && !bNameStarts) return -1
        if (!aNameStarts && bNameStarts) return 1

        // 3) 코드가 검색어로 시작
        const aCodeStarts = aCode.startsWith(qUpper)
        const bCodeStarts = bCode.startsWith(qUpper)
        if (aCodeStarts && !bCodeStarts) return -1
        if (!aCodeStarts && bCodeStarts) return 1

        // 4) 이름에 검색어 포함 (영문명만 일치보다 우선)
        const aNameContains = aName.includes(qLower)
        const bNameContains = bName.includes(qLower)
        if (aNameContains && !bNameContains) return -1
        if (!aNameContains && bNameContains) return 1

        // 5) 이름순
        return a.name.localeCompare(b.name)
      })

      // Deduplicate: remove any Supabase results that match alternative asset codes
      const altCodes = new Set(altStocks.map((a) => a.code))
      const filteredDbStocks = sorted.filter((s) => !altCodes.has(s.code)).slice(0, 20)

      const combined = [...altStocks, ...filteredDbStocks]
      console.log(
        `[stocks/search] Found ${combined.length} stocks (${altStocks.length} alternative + ${filteredDbStocks.length} from Supabase)`,
      )
      return NextResponse.json({
        stocks: combined,
        source: 'supabase',
      })
    }

    // 2. Supabase에 데이터가 없으면 stocks 테이블 총 개수 확인
    const { count: totalCount } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true })

    // stocks 테이블에 데이터가 있는데 검색 결과가 없으면 대안 자산만 반환
    if (totalCount && totalCount > 0) {
      if (altStocks.length > 0) {
        return NextResponse.json({
          stocks: altStocks,
          source: 'supabase',
        })
      }
      console.log(`[stocks/search] No match found in Supabase (total: ${totalCount} stocks)`)
      return NextResponse.json({
        stocks: [],
        source: 'supabase',
      })
    }

    // 3. Supabase stocks 테이블이 비어있으면 KRX API fallback
    console.log('[stocks/search] Supabase stocks table is empty, falling back to KRX API')

    const now = Date.now()
    if (stocksCache.length === 0 || now - cacheTimestamp > CACHE_DURATION) {
      console.log('[stocks/search] Fetching stocks from KRX API...')
      try {
        stocksCache = await fetchAllStocks()
        cacheTimestamp = now
        console.log(`[stocks/search] Cached ${stocksCache.length} stocks from KRX`)
      } catch (krxError) {
        console.error('[stocks/search] KRX API error:', krxError)
        return NextResponse.json({
          error: '종목 검색에 실패했습니다. 장 휴일에는 검색이 제한될 수 있습니다.',
          stocks: [],
          source: 'error',
        })
      }
    }

    // KRX 캐시에서 검색 후 대안 자산과 합쳐서 반환
    const results = searchStocks(stocksCache, q)
    const krxStocks = results.map((stock) => ({
      code: stock.code,
      name: stock.name,
      market: stock.market,
    }))

    // Deduplicate KRX results against alternative assets
    const altCodes = new Set(altStocks.map((a) => a.code))
    const filteredKrxStocks = krxStocks.filter((s) => !altCodes.has(s.code))
    const combined = [...altStocks, ...filteredKrxStocks]

    return NextResponse.json({
      stocks: combined,
      source: 'krx',
    })
  } catch (error) {
    console.error('[stocks/search] Error:', error)
    return NextResponse.json({ error: 'Failed to search stocks', stocks: [] }, { status: 500 })
  }
}
