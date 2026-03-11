/**
 * 데이터 프로바이더 추상화
 *
 * 두 가지 모드 지원:
 * 1. SheetDataProvider: Google Spreadsheet 연동 모드
 * 2. StandaloneDataProvider: DB + 외부 API 기반 독립 모드
 */

import { createServiceClient } from '@repo/database/server'
import { ALTERNATIVE_ASSET_CODES, getAlternativeAssetPrices } from './alternative-asset-api'
import { getUSDKRWRate } from './exchange-rate-api'
import { calculateMarketYields } from './exchange-rate-enrichment'
import type {
  AccountTrendData,
  MajorIndexYieldComparisonData,
  MonthlyProfitLoss,
} from './google-sheets'
import type { HistoricalMarketData } from './historical-exchange-rate'
import { type StockPrice, getStockPrices, isKoreanStock } from './stock-price-api'

// ============================================
// 공통 타입 정의
// ============================================

export interface PortfolioItem {
  ticker: string
  name: string
  quantity: number
  avgPrice: number
  currentPrice: number
  totalValue: number
  profit: number
  profitPercent: number
  currency: 'KRW' | 'USD'
  weight?: number // 포트폴리오 비중 (%)
  avgPriceOriginal?: number // 원본 통화 평단가 (편집용, KRW 환산 전)
}

export interface DashboardSummary {
  totalAsset: number // 총 자산 (KRW)
  totalInvested: number // 총 투자원금 (KRW)
  totalProfit: number // 총 수익금
  totalYield: number // 수익률 (%)
  thisMonthDividend: number
  yearlyDividend: number
  investmentDays: number
}

export interface DividendRecord {
  id?: string
  ticker: string
  name: string
  amountKRW: number
  amountUSD: number
  date: string
  account?: string
}

export interface DepositRecord {
  id?: string
  type: 'DEPOSIT' | 'WITHDRAW'
  amount: number
  date: string
  memo?: string
  account?: string
}

// ============================================
// 데이터 프로바이더 인터페이스
// ============================================

export interface DataProvider {
  mode: 'sheet' | 'standalone'

  // 대시보드 요약
  getDashboardSummary(userId: string): Promise<DashboardSummary>

  // 포트폴리오
  getPortfolio(userId: string): Promise<PortfolioItem[]>

  // 배당금
  getDividends(userId: string, year?: number): Promise<DividendRecord[]>
  saveDividend(userId: string, dividend: DividendRecord): Promise<boolean>
  deleteDividend(userId: string, dividend: DividendRecord): Promise<boolean>

  // 입출금
  getDeposits(userId: string): Promise<DepositRecord[]>
  saveDeposit(userId: string, deposit: DepositRecord): Promise<boolean>
  deleteDeposit(userId: string, deposit: DepositRecord): Promise<boolean>
}

// ============================================
// Standalone 데이터 프로바이더 (DB + API)
// ============================================

export class StandaloneDataProvider implements DataProvider {
  mode: 'sheet' | 'standalone' = 'standalone'

  async getDashboardSummary(userId: string): Promise<DashboardSummary> {
    const supabase = createServiceClient()

    let totalAsset = 0
    let totalInvested = 0
    const exchangeRate = await getUSDKRWRate()

    // 병렬 조회: account_balances, deposits, dividends, first deposit
    const [balanceResult, depositsResult, dividendsResult, firstDepositResult] = await Promise.all([
      (supabase as any)
        .from('account_balances')
        .select('year_month, balance')
        .eq('user_id', userId)
        .order('year_month', { ascending: false }),
      supabase.from('deposits').select('type, amount').eq('user_id', userId),
      supabase
        .from('dividends')
        .select('amount_krw, amount_usd, dividend_date')
        .eq('user_id', userId),
      supabase
        .from('deposits')
        .select('deposit_date')
        .eq('user_id', userId)
        .eq('type', 'DEPOSIT')
        .order('deposit_date', { ascending: true })
        .limit(1)
        .single(),
    ])

    const accountBalances = balanceResult.data
    const deposits = depositsResult.data
    const dividends = dividendsResult.data
    const firstDeposit = firstDepositResult.data

    if (accountBalances && accountBalances.length > 0) {
      totalAsset = accountBalances[0].balance || 0

      if (deposits && deposits.length > 0) {
        for (const d of deposits) {
          if (d.type === 'DEPOSIT') {
            totalInvested += d.amount || 0
          } else if (d.type === 'WITHDRAW') {
            totalInvested -= d.amount || 0
          }
        }
      }
    } else {
      // fallback: holdings 기반 계산
      const portfolio = await this.getPortfolio(userId)

      for (const item of portfolio) {
        if (item.ticker === 'CASH') {
          const krwAmount = item.quantity || 0
          const usdAmount = item.avgPriceOriginal || 0
          totalAsset += item.totalValue
          totalInvested += krwAmount + usdAmount * exchangeRate
          continue
        }
        totalAsset += item.totalValue
        totalInvested += item.avgPrice * item.quantity
      }
    }

    const totalProfit = totalAsset - totalInvested
    const totalYield = totalInvested > 0 ? ((totalAsset - totalInvested) / totalInvested) * 100 : 0

    // 배당금 계산
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth() + 1

    let thisMonthDividend = 0
    let yearlyDividend = 0

    if (dividends) {
      for (const d of dividends) {
        const date = new Date(d.dividend_date)
        const amount = (d.amount_krw || 0) + (d.amount_usd || 0) * exchangeRate

        if (date.getFullYear() === thisYear) {
          yearlyDividend += amount
          if (date.getMonth() + 1 === thisMonth) {
            thisMonthDividend += amount
          }
        }
      }
    }

    // 투자 일수 계산
    let investmentDays = 0
    if (firstDeposit) {
      const firstDate = new Date(firstDeposit.deposit_date)
      const today = new Date()
      investmentDays =
        Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }

    return {
      totalAsset: Math.round(totalAsset),
      totalInvested: Math.round(totalInvested),
      totalProfit: Math.round(totalProfit),
      totalYield: Number(totalYield.toFixed(2)),
      thisMonthDividend: Math.round(thisMonthDividend),
      yearlyDividend: Math.round(yearlyDividend),
      investmentDays,
    }
  }

  async getPortfolio(userId: string): Promise<PortfolioItem[]> {
    const supabase = createServiceClient()

    // holdings 테이블에서 보유종목 조회
    const { data: holdings } = await supabase.from('holdings').select('*').eq('user_id', userId)

    if (!holdings || holdings.length === 0) {
      return []
    }

    // 기타자산과 주식 분리
    const allTickers = holdings.map((h) => h.ticker)
    const altTickers = allTickers.filter((t) => ALTERNATIVE_ASSET_CODES.has(t))
    const stockTickers = allTickers.filter((t) => !ALTERNATIVE_ASSET_CODES.has(t))

    // 현재가 조회: 주식(KIS API) + 기타자산(스프레드시트) 병렬
    const [prices, altPriceResult] = await Promise.all([
      stockTickers.length > 0
        ? getStockPrices(stockTickers)
        : Promise.resolve(new Map<string, StockPrice>()),
      altTickers.length > 0
        ? getAlternativeAssetPrices()
            .then((result) => {
              console.log(
                `[StandaloneProvider] Got ${result.length} alt prices:`,
                result.map((a) => `${a.code}=${a.price}`).join(', '),
              )
              return result
            })
            .catch((error) => {
              console.error('[StandaloneProvider] Alternative asset price fetch failed:', error)
              return [] as { code: string; price: number }[]
            })
        : Promise.resolve([] as { code: string; price: number }[]),
    ])

    // 기타자산 가격을 prices 맵에 병합
    for (const alt of altPriceResult) {
      if (altTickers.includes(alt.code)) {
        prices.set(alt.code, {
          ticker: alt.code,
          price: alt.price,
          currency: 'KRW' as const,
          timestamp: Date.now(),
          source: 'spreadsheet',
        })
      }
    }

    // KIS API에서 가격을 못 가져온 종목은 DB 캐시에서 조회 (user cache + global cache 통합)
    const missingTickers = allTickers.filter((t) => !prices.has(t))
    if (missingTickers.length > 0) {
      console.log(
        `[StandaloneProvider] KIS API missing ${missingTickers.length} tickers: ${missingTickers.join(', ')}`,
      )

      // avg_price 맵 (캐시 오염 방지용)
      const avgPriceMap = new Map<string, number>()
      for (const h of holdings) {
        avgPriceMap.set(h.ticker, h.avg_price || 0)
      }

      // 각 종목의 expected currency
      const holdingCurrencyMap = new Map<string, string>()
      for (const h of holdings) {
        holdingCurrencyMap.set(h.ticker, h.currency || (isKoreanStock(h.ticker) ? 'KRW' : 'USD'))
      }

      // 7일 이내 캐시만 사용 (user + global 통합 조회)
      const cacheMaxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: allCachedPrices } = await supabase
        .from('portfolio_cache')
        .select('ticker, current_price, currency, user_id, updated_at')
        .in('ticker', missingTickers)
        .gt('current_price', 0)
        .gte('updated_at', cacheMaxAge)
        .order('updated_at', { ascending: false })

      if (allCachedPrices) {
        // user cache 우선, 그 다음 global cache (종목당 1건만)
        const used = new Set<string>()
        // 1차: user cache
        for (const cached of allCachedPrices) {
          if (used.has(cached.ticker)) continue
          if (cached.user_id !== userId) continue

          const avgP = avgPriceMap.get(cached.ticker)
          if (avgP && avgP > 0 && Math.abs((cached.current_price ?? 0) - avgP) / avgP < 0.01) {
            console.log(
              `[StandaloneProvider] Skipping poisoned cache: ${cached.ticker} (current_price=${cached.current_price} == avg_price)`,
            )
            continue
          }

          used.add(cached.ticker)
          prices.set(cached.ticker, {
            ticker: cached.ticker,
            price: cached.current_price ?? 0,
            currency: (cached.currency as 'KRW' | 'USD') || 'KRW',
            timestamp: Date.now(),
            source: 'db-cache',
          })
        }
        // 2차: global cache (user cache에서 못 찾은 종목)
        for (const cached of allCachedPrices) {
          if (used.has(cached.ticker)) continue
          if (cached.user_id === userId) continue // already processed above

          const expectedCurrency = holdingCurrencyMap.get(cached.ticker)
          if (expectedCurrency && cached.currency !== expectedCurrency) continue

          const holding = holdings.find((h) => h.ticker === cached.ticker)
          if (
            holding?.avg_price &&
            holding.avg_price > 0 &&
            Math.abs((cached.current_price ?? 0) - holding.avg_price) / holding.avg_price < 0.01
          )
            continue

          used.add(cached.ticker)
          prices.set(cached.ticker, {
            ticker: cached.ticker,
            price: cached.current_price ?? 0,
            currency: (cached.currency as 'KRW' | 'USD') || 'KRW',
            timestamp: Date.now(),
            source: 'global-cache',
          })
          console.log(
            `[StandaloneProvider] Global cache hit: ${cached.ticker} = ${cached.current_price} (from ${cached.updated_at})`,
          )
        }
      }
    }

    // 최종 재시도: 여전히 가격 없는 종목에 대해 일괄 KIS API 재호출
    const finalMissing = allTickers.filter((t) => !prices.has(t) && !ALTERNATIVE_ASSET_CODES.has(t))
    if (finalMissing.length > 0) {
      console.log(
        `[StandaloneProvider] Final retry for ${finalMissing.length} tickers: ${finalMissing.join(', ')}`,
      )
      const retryResult = await getStockPrices(finalMissing)
      for (const [ticker, price] of retryResult) {
        if (price && price.price > 0) {
          prices.set(ticker, price)
          console.log(`[StandaloneProvider] Final retry success: ${ticker} = ${price.price}`)
        }
      }
    }

    // 환율 조회
    const exchangeRate = await getUSDKRWRate()

    // 포트폴리오 아이템 생성
    const portfolio: PortfolioItem[] = []
    // 캐시용 원본 가격 보관 (USD 이중 환산 방지)
    const originalPrices: Map<string, { currentPrice: number; currency: 'KRW' | 'USD' }> = new Map()
    let totalValueKRW = 0

    for (const holding of holdings) {
      // CASH 특수 처리: quantity=원화금액, avg_price=달러금액
      if (holding.ticker === 'CASH') {
        const krwAmount = holding.quantity || 0
        const usdAmount = holding.avg_price || 0
        const totalValue = krwAmount + usdAmount * exchangeRate
        totalValueKRW += totalValue

        portfolio.push({
          ticker: holding.ticker,
          name: holding.name || '현금',
          quantity: krwAmount,
          avgPrice: usdAmount, // 달러 금액 (편집용으로 사용)
          avgPriceOriginal: usdAmount, // 달러 금액 원본
          currentPrice: Math.round(totalValue),
          totalValue: Math.round(totalValue),
          profit: 0,
          profitPercent: 0,
          currency: 'KRW',
        })
        continue
      }

      const priceData = prices.get(holding.ticker)
      const isAltAsset = ALTERNATIVE_ASSET_CODES.has(holding.ticker)
      // 가격을 못 가져온 경우: 주식은 avg_price 폴백 (표시용), 기타자산은 0
      // 주의: avg_price 폴백 시 수익률은 0%로 표시됨 (가격 미조회 상태)
      const currentPrice = priceData?.price || (isAltAsset ? 0 : holding.avg_price || 0)
      const priceIsStale = !priceData?.price && !isAltAsset
      if (priceIsStale) {
        console.warn(
          `[Portfolio] No live price for ${holding.ticker}, falling back to avgPrice=${holding.avg_price} (yield will be 0%)`,
        )
      }
      const currency =
        (holding.currency as 'KRW' | 'USD') || (isKoreanStock(holding.ticker) ? 'KRW' : 'USD')

      const quantity = holding.quantity || 0
      const avgPrice = holding.avg_price || 0
      const totalValue = currentPrice * quantity
      const invested = avgPrice * quantity
      const profit = totalValue - invested
      const profitPercent = invested > 0 ? (profit / invested) * 100 : 0

      // KRW 환산
      const rate = currency === 'USD' ? exchangeRate : 1
      totalValueKRW += totalValue * rate

      // 캐시용 원본 가격 저장 (환산 전)
      originalPrices.set(holding.ticker, { currentPrice, currency })

      portfolio.push({
        ticker: holding.ticker,
        name: holding.name || holding.ticker,
        quantity,
        avgPrice: Math.round(avgPrice * rate),
        avgPriceOriginal: avgPrice, // 원본 통화 값 (편집용)
        currentPrice: Math.round(currentPrice * rate),
        totalValue: Math.round(totalValue * rate),
        profit: Math.round(profit * rate),
        profitPercent: Number(profitPercent.toFixed(2)),
        currency,
      })
    }

    // 비중 계산 (totalValue는 이미 KRW 환산된 값)
    for (const item of portfolio) {
      item.weight =
        totalValueKRW > 0 ? Number(((item.totalValue / totalValueKRW) * 100).toFixed(2)) : 0
    }

    // 현재가 캐시 업데이트 (원본 가격으로 저장, KRW 환산값이 아닌 API 원본)
    // 캐시 오염 방지: avg_price와 동일한 값은 저장하지 않음
    const apiPricedItems = portfolio
      .filter((item) => {
        const p = prices.get(item.ticker)
        if (!p || p.source === 'db-cache' || p.source === 'global-cache') return false
        // avg_price와 같은 값은 캐시하지 않음 (KIS API 실패 시 폴백값이 캐시되는 것 방지)
        const holding = holdings.find((h) => h.ticker === item.ticker)
        const orig = originalPrices.get(item.ticker)
        const realPrice = orig?.currentPrice ?? item.currentPrice
        const holdingAvg = holding?.avg_price || 0
        if (holding && holdingAvg > 0 && Math.abs(realPrice - holdingAvg) / holdingAvg < 0.01) {
          console.log(
            `[StandaloneProvider] Skip caching ${item.ticker}: price=${realPrice} equals avg_price`,
          )
          return false
        }
        return true
      })
      .map((item) => {
        const orig = originalPrices.get(item.ticker)
        return {
          ...item,
          currentPrice: orig?.currentPrice ?? item.currentPrice,
        }
      })
    void this.updatePriceCache(userId, apiPricedItems)

    return portfolio
  }

  private async updatePriceCache(userId: string, portfolio: PortfolioItem[]): Promise<void> {
    if (portfolio.length === 0) return

    const supabase = createServiceClient()

    const updates = portfolio.map((item) => ({
      user_id: userId,
      ticker: item.ticker,
      current_price: item.currentPrice,
      currency: item.currency,
      updated_at: new Date().toISOString(),
    }))

    await supabase.from('portfolio_cache').upsert(updates, { onConflict: 'user_id,ticker' })
  }

  async getDividends(userId: string, year?: number): Promise<DividendRecord[]> {
    const supabase = createServiceClient()

    let query = supabase
      .from('dividends')
      .select('*')
      .eq('user_id', userId)
      .order('dividend_date', { ascending: false })

    if (year) {
      query = query.gte('dividend_date', `${year}-01-01`).lte('dividend_date', `${year}-12-31`)
    }

    const { data } = await query

    return (data || []).map((d) => ({
      id: d.id,
      ticker: d.ticker,
      name: d.name || d.ticker,
      amountKRW: d.amount_krw || 0,
      amountUSD: d.amount_usd || 0,
      date: d.dividend_date,
      account: d.account || undefined,
    }))
  }

  async saveDividend(userId: string, dividend: DividendRecord): Promise<boolean> {
    const supabase = createServiceClient()

    const { error } = await supabase.from('dividends').insert({
      user_id: userId,
      ticker: dividend.ticker,
      name: dividend.name,
      amount_krw: dividend.amountKRW,
      amount_usd: dividend.amountUSD,
      dividend_date: dividend.date,
      sheet_synced: false, // Standalone 모드이므로 false
    })

    if (error) {
      console.error('[StandaloneProvider] saveDividend error:', error)
      return false
    }

    return true
  }

  async deleteDividend(userId: string, dividend: DividendRecord): Promise<boolean> {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('dividends')
      .delete()
      .eq('user_id', userId)
      .eq('ticker', dividend.ticker)
      .eq('dividend_date', dividend.date)
      .eq('amount_krw', dividend.amountKRW)
      .eq('amount_usd', dividend.amountUSD)

    if (error) {
      console.error('[StandaloneProvider] deleteDividend error:', error)
      return false
    }

    return true
  }

  async getDeposits(userId: string): Promise<DepositRecord[]> {
    const supabase = createServiceClient()

    const { data } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('deposit_date', { ascending: false })

    return (data || []).map((d) => ({
      id: d.id,
      type: d.type as 'DEPOSIT' | 'WITHDRAW',
      amount: d.amount || 0,
      date: d.deposit_date,
      memo: d.memo || undefined,
    }))
  }

  async saveDeposit(userId: string, deposit: DepositRecord): Promise<boolean> {
    const supabase = createServiceClient()

    const { error } = await supabase.from('deposits').insert({
      user_id: userId,
      type: deposit.type,
      amount: deposit.amount,
      currency: 'KRW',
      deposit_date: deposit.date,
      memo: deposit.memo || null,
      sheet_synced: false, // Standalone 모드이므로 false
    })

    if (error) {
      console.error('[StandaloneProvider] saveDeposit error:', error)
      return false
    }

    return true
  }

  async deleteDeposit(userId: string, deposit: DepositRecord): Promise<boolean> {
    const supabase = createServiceClient()

    const { error } = await supabase
      .from('deposits')
      .delete()
      .eq('user_id', userId)
      .eq('type', deposit.type)
      .eq('amount', deposit.amount)
      .eq('deposit_date', deposit.date)

    if (error) {
      console.error('[StandaloneProvider] deleteDeposit error:', error)
      return false
    }

    return true
  }

  /**
   * 계좌 추세 데이터 조회 (account_balances + deposits)
   * Sheet 모드의 parseAccountTrendData()와 동일한 출력 형태
   */
  async getAccountTrend(userId: string): Promise<AccountTrendData[]> {
    const supabase = createServiceClient()

    // account_balances + deposits 병렬 조회
    const [balancesResult, depositsResult] = await Promise.all([
      (supabase as any)
        .from('account_balances')
        .select('year_month, balance')
        .eq('user_id', userId)
        .order('year_month', { ascending: true }),
      supabase
        .from('deposits')
        .select('type, amount, deposit_date')
        .eq('user_id', userId)
        .order('deposit_date', { ascending: true }),
    ])

    const balances = balancesResult.data
    const deposits = depositsResult.data

    if (!balances || balances.length === 0) {
      return []
    }

    // 월별 순입금액 계산
    const monthlyNetDeposit = new Map<string, number>()
    if (deposits) {
      for (const d of deposits) {
        const date = new Date(d.deposit_date)
        const ym = `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, '0')}`
        const current = monthlyNetDeposit.get(ym) || 0
        const amount = d.type === 'DEPOSIT' ? d.amount || 0 : -(d.amount || 0)
        monthlyNetDeposit.set(ym, current + amount)
      }
    }

    // AccountTrendData 생성
    const result: AccountTrendData[] = []
    let cumulativeDeposit = 0

    for (const b of balances) {
      // year_month: "2025-01" → "25.01"
      const parts = (b.year_month as string).split('-')
      const date = `${(parts[0] || '').slice(2)}.${parts[1] || ''}`

      // 누적 입금액 갱신
      const netDeposit = monthlyNetDeposit.get(date) || 0
      cumulativeDeposit += netDeposit

      result.push({
        date,
        totalAccount: b.balance || 0,
        cumulativeDeposit: Math.round(cumulativeDeposit),
      })
    }

    return result
  }

  /**
   * 월별 손익 데이터 조회 (account_balances 기반)
   * 순손익 = (이번달 잔액 - 지난달 잔액) - (이번달 순입금액)
   */
  async getMonthlyProfitLoss(userId: string): Promise<MonthlyProfitLoss[]> {
    const supabase = createServiceClient()

    // 올해 account_balances 조회
    const now = new Date()
    const currentYear = now.getFullYear()
    const yearPrefix = `${currentYear}-`

    // 올해 balances + deposits + 작년 12월 balance 병렬 조회
    const [balancesResult, depositsResult, prevYearResult] = await Promise.all([
      (supabase as any)
        .from('account_balances')
        .select('year_month, balance')
        .eq('user_id', userId)
        .like('year_month', `${yearPrefix}%`)
        .order('year_month', { ascending: true }),
      supabase
        .from('deposits')
        .select('type, amount, deposit_date')
        .eq('user_id', userId)
        .gte('deposit_date', `${currentYear}-01-01`)
        .lte('deposit_date', `${currentYear}-12-31`),
      (supabase as any)
        .from('account_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('year_month', `${currentYear - 1}-12`)
        .single(),
    ])

    const balances = balancesResult.data
    const deposits = depositsResult.data

    if (!balances || balances.length === 0) {
      return []
    }

    // 월별 순입금액 계산
    const monthlyNetDeposit = new Map<number, number>()
    if (deposits) {
      for (const d of deposits) {
        const month = new Date(d.deposit_date).getMonth() + 1
        const current = monthlyNetDeposit.get(month) || 0
        const amount = d.type === 'DEPOSIT' ? d.amount || 0 : -(d.amount || 0)
        monthlyNetDeposit.set(month, current + amount)
      }
    }

    // 월별 잔액 맵
    const monthlyBalance = new Map<number, number>()
    for (const b of balances) {
      const month = Number.parseInt((b.year_month as string).split('-')[1] || '0', 10)
      monthlyBalance.set(month, b.balance || 0)
    }

    let prevBalance = 0
    if (prevYearResult.data) {
      prevBalance = prevYearResult.data.balance || 0
    }

    // MonthlyProfitLoss 생성 (1월~현재월까지 항상 포함, 데이터 없는 달은 0)
    const result: MonthlyProfitLoss[] = []
    let lastBalance = prevBalance
    const currentMonth = now.getMonth() + 1

    for (let m = 1; m <= currentMonth; m++) {
      const balance = monthlyBalance.get(m)
      if (balance === undefined) {
        // 데이터 없는 달도 0으로 포함 (1월부터 항상 표시)
        result.push({ month: `${m}월`, profit: 0, loss: 0 })
        continue
      }

      const netDeposit = monthlyNetDeposit.get(m) || 0
      const netPL = balance - lastBalance - netDeposit

      result.push({
        month: `${m}월`,
        profit: netPL > 0 ? Math.round(netPL) : 0,
        loss: netPL < 0 ? Math.round(Math.abs(netPL)) : 0,
      })

      lastBalance = balance
    }

    return result
  }

  /**
   * 주요 지수 수익률 비교 데이터 조회 (YTD 기준)
   * 공개 스프레드시트의 historical market data를 사용하여
   * Sheet 모드와 동일한 실제 YTD 수익률을 계산
   */
  async getMajorIndexYieldComparison(
    userId: string,
    historicalRates?: Map<string, number>,
    marketData?: HistoricalMarketData,
  ): Promise<MajorIndexYieldComparisonData | null> {
    const supabase = createServiceClient()

    try {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() // 0-indexed

      // 1. 월별 레이블 생성
      const months = ['시작']
      for (let m = 0; m <= currentMonth; m++) {
        months.push(`${m + 1}월`)
      }

      // 2. 시장 데이터에서 모든 수익률 계산 (KOSPI, S&P500, NASDAQ, 달러, 금, BTC, 부동산)
      if (!marketData) {
        console.warn('[StandaloneProvider] No market data available - skipping comparison chart')
        return null
      }

      const marketYields = calculateMarketYields(months, marketData, currentYear)

      // 지수 데이터 유효성 확인 (하나라도 있어야 차트 표시)
      const hasKospi = marketYields.kospi.some((v) => v !== 0)
      const hasSP500 = marketYields.sp500.some((v) => v !== 0)
      const hasNasdaq = marketYields.nasdaq.some((v) => v !== 0)

      if (!hasKospi && !hasSP500 && !hasNasdaq) {
        console.warn(
          '[StandaloneProvider] No index data in market data - skipping comparison chart',
        )
        return null
      }

      // 3. 계좌 수익률 계산 (포트폴리오 스냅샷 or account_balances)
      const yearStart = `${currentYear}-01-01`
      let accountYields: (number | null)[]

      const { data: snapshots } = await supabase
        .from('portfolio_snapshots')
        .select('snapshot_date, total_asset, total_invested')
        .eq('user_id', userId)
        .gte('snapshot_date', yearStart)
        .order('snapshot_date', { ascending: true })

      if (snapshots && snapshots.length > 0) {
        // 포트폴리오 스냅샷 있음 → 기존 수익률 계산 사용
        const normalizedSnapshots = snapshots.map((s) => ({
          snapshot_date: s.snapshot_date,
          total_asset: s.total_asset ?? 0,
          total_invested: s.total_invested ?? 0,
        }))
        accountYields = this.calculateAccountYields(normalizedSnapshots, currentMonth + 1)
      } else {
        // Fallback: account_balances + deposits 병렬 조회 → 입금 차감 수익률 계산
        const [balancesRes, allDepositsRes] = await Promise.all([
          (supabase as any)
            .from('account_balances')
            .select('year_month, balance')
            .eq('user_id', userId)
            .gte('year_month', `${currentYear}-01`)
            .order('year_month', { ascending: true }),
          (supabase as any)
            .from('deposits')
            .select('amount, type, deposit_date')
            .eq('user_id', userId)
            .order('deposit_date', { ascending: true }),
        ])
        const balances = balancesRes.data
        const allDeposits = allDepositsRes.data

        // 월별 누적 투자금 계산 (YYYY-MM → 누적액)
        const cumulativeByYM = new Map<string, number>()
        let runningInvested = 0
        for (const d of allDeposits || []) {
          runningInvested += d.type === 'DEPOSIT' ? d.amount || 0 : -(d.amount || 0)
          const ym = (d.deposit_date as string).slice(0, 7)
          cumulativeByYM.set(ym, runningInvested)
        }

        // 특정 year-month까지의 누적 투자금 반환 (해당 월에 입금이 없어도 이전 값 유지)
        const getInvestedAt = (year: number, month: number): number => {
          const targetYM = `${year}-${String(month).padStart(2, '0')}`
          let result = 0
          const sorted = Array.from(cumulativeByYM.entries()).sort(([a], [b]) => a.localeCompare(b))
          for (const [ym, val] of sorted) {
            if (ym <= targetYM) result = val
            else break
          }
          return result
        }

        accountYields = [0] // 시작점

        if (balances && balances.length > 0) {
          const monthlyBalance = new Map<number, number>()
          for (const b of balances) {
            const month = Number.parseInt((b.year_month as string).split('-')[1] || '0', 10)
            monthlyBalance.set(month, b.balance || 0)
          }

          const firstDataMonth = Math.min(...Array.from(monthlyBalance.keys()))

          for (let m = 1; m <= currentMonth + 1; m++) {
            const bal = monthlyBalance.get(m)
            if (bal !== undefined) {
              const invested = getInvestedAt(currentYear, m)
              if (invested > 0) {
                // 수익률 = (잔고 - 누적투자금) / 누적투자금 * 100
                accountYields.push(Math.round(((bal - invested) / invested) * 1000) / 10)
              } else {
                accountYields.push(0)
              }
            } else {
              accountYields.push(m < firstDataMonth ? 0 : null)
            }
          }
        } else {
          for (let i = 0; i < currentMonth + 1; i++) accountYields.push(null)
        }
      }

      console.log('[StandaloneProvider] Index comparison (historical):', {
        kospiYTD: marketYields.kospi[marketYields.kospi.length - 1],
        sp500YTD: marketYields.sp500[marketYields.sp500.length - 1],
        nasdaqYTD: marketYields.nasdaq[marketYields.nasdaq.length - 1],
        dollarYTD: marketYields.dollar[marketYields.dollar.length - 1],
      })

      return {
        months,
        sp500: marketYields.sp500,
        nasdaq: marketYields.nasdaq,
        kospi: marketYields.kospi,
        account: accountYields,
        sp500Dollar: marketYields.sp500Dollar,
        nasdaqDollar: marketYields.nasdaqDollar,
        dollar: marketYields.dollar,
        gold: marketYields.gold,
        bitcoin: marketYields.bitcoin,
        realEstate: marketYields.realEstate,
        goldDollar: marketYields.goldDollar,
        bitcoinDollar: marketYields.bitcoinDollar,
      }
    } catch (error) {
      console.error('[StandaloneProvider] getMajorIndexYieldComparison error:', error)
      return null
    }
  }

  /**
   * 포트폴리오 스냅샷 기반 월별 수익률 계산
   */
  private calculateAccountYields(
    snapshots: Array<{
      snapshot_date: string
      total_asset: number
      total_invested: number
    }>,
    monthCount: number,
  ): (number | null)[] {
    const yields: (number | null)[] = [0] // 시작점은 0%

    if (snapshots.length === 0) {
      // 스냅샷이 없으면 null로 채움
      for (let i = 0; i < monthCount; i++) {
        yields.push(null)
      }
      return yields
    }

    // 연초 투자금 기준 (첫 번째 스냅샷의 투자금)
    const firstSnapshot = snapshots[0]
    const startInvested = firstSnapshot?.total_invested || 0

    if (startInvested === 0) {
      for (let i = 0; i < monthCount; i++) {
        yields.push(null)
      }
      return yields
    }

    // 월별로 그룹화
    const monthlySnapshots = new Map<number, (typeof snapshots)[0]>()
    for (const snapshot of snapshots) {
      const month = new Date(snapshot.snapshot_date).getMonth() // 0-indexed
      // 각 월의 마지막 스냅샷 사용
      monthlySnapshots.set(month, snapshot)
    }

    // 첫 데이터가 있는 월 찾기
    const firstDataMonth = Math.min(...Array.from(monthlySnapshots.keys()))

    // 월별 수익률 계산
    for (let m = 0; m < monthCount; m++) {
      const monthSnapshot = monthlySnapshots.get(m)

      if (!monthSnapshot) {
        // 첫 데이터 이전 월은 0%로 채움 (라인이 연결되도록)
        // 첫 데이터 이후 빈 월은 null (forward-fill 안 함)
        yields.push(m < firstDataMonth ? 0 : null)
        continue
      }

      const asset = monthSnapshot.total_asset
      const invested = monthSnapshot.total_invested

      // 현재 투자금 대비 수익률: (자산 - 투자금) / 투자금 * 100
      if (invested > 0) {
        const yieldPercent = ((asset - invested) / invested) * 100
        yields.push(Number(yieldPercent.toFixed(1)))
      } else {
        yields.push(null)
      }
    }

    return yields
  }
}

// ============================================
// 프로바이더 팩토리
// ============================================

/**
 * 사용자 모드에 따라 적절한 데이터 프로바이더 반환
 */
export async function getDataProvider(userId: string): Promise<{
  provider: DataProvider
  isStandalone: boolean
}> {
  const supabase = createServiceClient()

  // 사용자 조회
  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('id', userId)
    .single()

  const isStandalone = !user?.spreadsheet_id

  if (isStandalone) {
    return {
      provider: new StandaloneDataProvider(),
      isStandalone: true,
    }
  }

  // Sheet 모드: 기존 로직 사용 (별도 provider 클래스로 분리 가능)
  // 현재는 standalone provider만 구현하고, sheet 모드는 기존 action들 사용
  return {
    provider: new StandaloneDataProvider(), // fallback
    isStandalone: false,
  }
}

/**
 * 사용자가 Standalone 모드인지 확인
 */
export async function isStandaloneUser(userId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('id', userId)
    .single()

  return !user?.spreadsheet_id
}

/**
 * 이메일로 사용자 모드 확인
 */
export async function isStandaloneUserByEmail(email: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: user } = await supabase
    .from('users')
    .select('spreadsheet_id')
    .eq('email', email)
    .single()

  return !user?.spreadsheet_id
}
