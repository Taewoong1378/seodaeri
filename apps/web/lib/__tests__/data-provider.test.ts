import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock all external dependencies before importing the module under test
vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('../exchange-rate-api', () => ({
  getUSDKRWRate: vi.fn(() => Promise.resolve(1400)),
}))

vi.mock('../stock-price-api', () => ({
  getStockPrices: vi.fn(() => Promise.resolve(new Map())),
  isKoreanStock: vi.fn((ticker: string) => /^\d{6}$/.test(ticker) || /^KR\d{10}$/.test(ticker)),
}))

vi.mock('../alternative-asset-api', () => ({
  ALTERNATIVE_ASSET_CODES: new Set(['BTC', 'ETH', 'XRP', 'SOL_CRYPTO', 'GOLD']),
  getAlternativeAssetPrices: vi.fn(() => Promise.resolve([])),
}))

vi.mock('../exchange-rate-enrichment', () => ({
  calculateMarketYields: vi.fn(() => ({
    gold: [0],
    bitcoin: [0],
    realEstate: [0],
    dollar: [0],
    kospi: [0],
    sp500: [0],
    nasdaq: [0],
    sp500Dollar: [0],
    nasdaqDollar: [0],
    goldDollar: [0],
    bitcoinDollar: [0],
  })),
}))

import { createServiceClient } from '@repo/database/server'
import { getAlternativeAssetPrices } from '../alternative-asset-api'
import { StandaloneDataProvider } from '../data-provider'
import { getUSDKRWRate } from '../exchange-rate-api'
import { getStockPrices } from '../stock-price-api'

// ---------------------------------------------------------------------------
// Helper: build a Supabase mock chain
// ---------------------------------------------------------------------------

function createMockChain(resolvedValue: { data: any; error: any } = { data: null, error: null }) {
  const chain: Record<string, any> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    insert: vi.fn().mockResolvedValue({ error: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  }
  // Make the chain itself awaitable for queries that resolve without .single()
  // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
  ;(chain as any).then = (resolve: (v: any) => any) => Promise.resolve(resolvedValue).then(resolve)
  return chain
}

// Build a supabase mock where each table can return its own data
function createMockSupabase(tableData: Record<string, any> = {}) {
  const mock = {
    from: vi.fn((table: string) => {
      const resolved =
        table in tableData ? { data: tableData[table], error: null } : { data: null, error: null }
      return createMockChain(resolved)
    }),
  }
  return mock
}

// ---------------------------------------------------------------------------
// getDashboardSummary
// ---------------------------------------------------------------------------

describe('StandaloneDataProvider.getDashboardSummary', () => {
  let provider: StandaloneDataProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StandaloneDataProvider()
  })

  it('calculates 10% yield when asset exceeds invested by 10%', async () => {
    const mockSupa = {
      from: vi.fn(),
    }

    mockSupa.from.mockImplementation((table: string) => {
      if (table === 'account_balances') {
        const chain = createMockChain({
          data: [{ year_month: '2025-01', balance: 11000000 }],
          error: null,
        })
        return chain
      }
      if (table === 'dividends') {
        return createMockChain({ data: [], error: null })
      }
      if (table === 'deposits') {
        // Both the full-deposits query and the first-deposit .single() query go through here.
        // We use a chain where order().limit().single() resolves correctly and
        // the plain order() also resolves correctly.
        const chain: Record<string, any> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          // Used by the first-deposit query (chain ends with .single())
          single: vi.fn().mockResolvedValue({
            data: { deposit_date: '2025-01-01' },
            error: null,
          }),
          // Make the chain awaitable for the deposits-list query (no .single())
          // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
          then: (resolve: (v: any) => any) =>
            Promise.resolve({ data: [{ type: 'DEPOSIT', amount: 10000000 }], error: null }).then(
              resolve,
            ),
        }
        return chain
      }
      return createMockChain({ data: null, error: null })
    })

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    const result = await provider.getDashboardSummary('user-1')

    expect(result.totalAsset).toBe(11000000)
    expect(result.totalInvested).toBe(10000000)
    expect(result.totalProfit).toBe(1000000)
    expect(result.totalYield).toBe(10)
  })

  it('returns 0% yield when totalInvested is 0 (no deposits)', async () => {
    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          return createMockChain({
            data: [{ year_month: '2025-01', balance: 5000000 }],
            error: null,
          })
        }
        if (table === 'dividends') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'deposits') {
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({ data: [], error: null }).then(resolve),
          }
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)

    const result = await provider.getDashboardSummary('user-1')

    expect(result.totalInvested).toBe(0)
    expect(result.totalYield).toBe(0)
  })

  it('calculates negative yield when asset is below invested amount', async () => {
    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          return createMockChain({
            data: [{ year_month: '2025-01', balance: 9000000 }],
            error: null,
          })
        }
        if (table === 'dividends') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'deposits') {
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi
              .fn()
              .mockResolvedValue({ data: { deposit_date: '2025-01-01' }, error: null }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({ data: [{ type: 'DEPOSIT', amount: 10000000 }], error: null }).then(
                resolve,
              ),
          }
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)

    const result = await provider.getDashboardSummary('user-1')

    expect(result.totalYield).toBe(-10)
    expect(result.totalProfit).toBe(-1000000)
  })

  it('subtracts WITHDRAW amounts from totalInvested', async () => {
    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          return createMockChain({
            data: [{ year_month: '2025-01', balance: 8000000 }],
            error: null,
          })
        }
        if (table === 'dividends') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'deposits') {
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi
              .fn()
              .mockResolvedValue({ data: { deposit_date: '2025-01-01' }, error: null }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({
                data: [
                  { type: 'DEPOSIT', amount: 10000000 },
                  { type: 'WITHDRAW', amount: 2000000 },
                ],
                error: null,
              }).then(resolve),
          }
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)

    const result = await provider.getDashboardSummary('user-1')

    // invested = 10,000,000 - 2,000,000 = 8,000,000
    expect(result.totalInvested).toBe(8000000)
    // asset = invested → 0% yield
    expect(result.totalYield).toBe(0)
  })

  it('calculates investmentDays as floor((today - firstDate) / msPerDay) + 1', async () => {
    // Pin first deposit to exactly 9 days ago
    const today = new Date()
    const firstDate = new Date(today)
    firstDate.setDate(today.getDate() - 9)
    const firstDateStr = firstDate.toISOString().slice(0, 10)

    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          return createMockChain({
            data: [{ year_month: '2025-01', balance: 10000000 }],
            error: null,
          })
        }
        if (table === 'dividends') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'deposits') {
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi
              .fn()
              .mockResolvedValue({ data: { deposit_date: firstDateStr }, error: null }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({ data: [{ type: 'DEPOSIT', amount: 10000000 }], error: null }).then(
                resolve,
              ),
          }
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)

    const result = await provider.getDashboardSummary('user-1')

    // floor((today - firstDate) / ms_per_day) + 1 = 9 + 1 = 10
    expect(result.investmentDays).toBe(10)
  })

  it('returns investmentDays = 0 when there is no first deposit', async () => {
    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          return createMockChain({
            data: [{ year_month: '2025-01', balance: 10000000 }],
            error: null,
          })
        }
        if (table === 'dividends') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'deposits') {
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({ data: [], error: null }).then(resolve),
          }
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)

    const result = await provider.getDashboardSummary('user-1')

    expect(result.investmentDays).toBe(0)
  })

  it('accumulates dividends for the current year and current month', async () => {
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth() + 1
    const thisMonthStr = `${thisYear}-${String(thisMonth).padStart(2, '0')}-15`
    const lastYearStr = `${thisYear - 1}-06-15`
    const otherMonthStr = `${thisYear}-${String(thisMonth === 1 ? 12 : thisMonth - 1).padStart(2, '0')}-15`

    const dividends = [
      // This month: 50,000 KRW + 10 USD * 1400 = 64,000
      { amount_krw: 50000, amount_usd: 10, dividend_date: thisMonthStr },
      // This year but not this month: 30,000 KRW only
      { amount_krw: 30000, amount_usd: 0, dividend_date: otherMonthStr },
      // Last year: should be excluded
      { amount_krw: 100000, amount_usd: 0, dividend_date: lastYearStr },
    ]

    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          return createMockChain({
            data: [{ year_month: '2025-01', balance: 10000000 }],
            error: null,
          })
        }
        if (table === 'dividends') {
          return createMockChain({ data: dividends, error: null })
        }
        if (table === 'deposits') {
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({ data: [], error: null }).then(resolve),
          }
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }

    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    const result = await provider.getDashboardSummary('user-1')

    // thisMonthDividend = 50000 + 10 * 1400 = 64000
    expect(result.thisMonthDividend).toBe(64000)
    // yearlyDividend = 64000 + 30000 = 94000 (last year excluded)
    expect(result.yearlyDividend).toBe(94000)
  })
})

// ---------------------------------------------------------------------------
// getMonthlyProfitLoss
// ---------------------------------------------------------------------------

describe('StandaloneDataProvider.getMonthlyProfitLoss', () => {
  let provider: StandaloneDataProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StandaloneDataProvider()
  })

  // Build a supabase mock for getMonthlyProfitLoss (3 parallel queries)
  function buildMonthlyMock(opts: {
    balances: Array<{ year_month: string; balance: number }>
    deposits: Array<{ type: string; amount: number; deposit_date: string }>
    prevBalance: number | null
  }) {
    const currentYear = new Date().getFullYear()
    return {
      from: vi.fn((table: string) => {
        if (table === 'account_balances') {
          // Two queries hit account_balances:
          //   1. Like query (current-year balances) — awaited via .order()
          //   2. Single query (prev-year December) — awaited via .single()
          const chain: Record<string, any> = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            like: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: opts.prevBalance !== null ? { balance: opts.prevBalance } : null,
              error: null,
            }),
            // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
            then: (resolve: (v: any) => any) =>
              Promise.resolve({ data: opts.balances, error: null }).then(resolve),
          }
          return chain
        }
        if (table === 'deposits') {
          return createMockChain({ data: opts.deposits, error: null })
        }
        return createMockChain({ data: null, error: null })
      }),
    }
  }

  it('returns empty array when there are no account_balances', async () => {
    const mock = buildMonthlyMock({ balances: [], deposits: [], prevBalance: null })
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMonthlyProfitLoss('user-1')

    expect(result).toEqual([])
  })

  it('records profit when balance rises more than net deposit', async () => {
    const currentYear = new Date().getFullYear()
    const mock = buildMonthlyMock({
      balances: [{ year_month: `${currentYear}-01`, balance: 11000000 }],
      deposits: [],
      prevBalance: 10000000, // prev Dec balance
    })
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMonthlyProfitLoss('user-1')

    const jan = result.find((r) => r.month === '1월')
    expect(jan).toBeDefined()
    // netPL = 11,000,000 - 10,000,000 - 0 = 1,000,000
    expect(jan!.profit).toBe(1000000)
    expect(jan!.loss).toBe(0)
  })

  it('records loss when balance falls below previous balance', async () => {
    const currentYear = new Date().getFullYear()
    const mock = buildMonthlyMock({
      balances: [{ year_month: `${currentYear}-01`, balance: 9000000 }],
      deposits: [],
      prevBalance: 10000000,
    })
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMonthlyProfitLoss('user-1')

    const jan = result.find((r) => r.month === '1월')
    expect(jan!.loss).toBe(1000000)
    expect(jan!.profit).toBe(0)
  })

  it('subtracts net deposit from PL calculation', async () => {
    const currentYear = new Date().getFullYear()
    const depositDate = `${currentYear}-01-15`
    const mock = buildMonthlyMock({
      balances: [{ year_month: `${currentYear}-01`, balance: 15000000 }],
      deposits: [{ type: 'DEPOSIT', amount: 5000000, deposit_date: depositDate }],
      prevBalance: 10000000,
    })
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMonthlyProfitLoss('user-1')

    const jan = result.find((r) => r.month === '1월')
    // netPL = 15,000,000 - 10,000,000 - 5,000,000 = 0
    expect(jan!.profit).toBe(0)
    expect(jan!.loss).toBe(0)
  })

  it('includes a zero-profit row for months with no balance data', async () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Only provide March balance; Jan and Feb should appear as zeros
    if (currentMonth < 3) {
      // Test only meaningful when we're in March or later
      return
    }

    const mock = buildMonthlyMock({
      balances: [{ year_month: `${currentYear}-03`, balance: 10000000 }],
      deposits: [],
      prevBalance: null,
    })
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMonthlyProfitLoss('user-1')

    const jan = result.find((r) => r.month === '1월')
    const feb = result.find((r) => r.month === '2월')
    expect(jan).toBeDefined()
    expect(jan!.profit).toBe(0)
    expect(jan!.loss).toBe(0)
    expect(feb).toBeDefined()
    expect(feb!.profit).toBe(0)
    expect(feb!.loss).toBe(0)
  })

  it('rounds netPL to nearest integer', async () => {
    const currentYear = new Date().getFullYear()
    const mock = buildMonthlyMock({
      balances: [{ year_month: `${currentYear}-01`, balance: 10000500 }],
      deposits: [],
      prevBalance: 10000000,
    })
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMonthlyProfitLoss('user-1')

    const jan = result.find((r) => r.month === '1월')
    expect(jan!.profit).toBe(500)
  })
})

// ---------------------------------------------------------------------------
// getPortfolio
// ---------------------------------------------------------------------------

describe('StandaloneDataProvider.getPortfolio', () => {
  let provider: StandaloneDataProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StandaloneDataProvider()
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)
    vi.mocked(getStockPrices).mockResolvedValue(new Map())
    vi.mocked(getAlternativeAssetPrices).mockResolvedValue([])
  })

  function buildPortfolioMock(holdings: any[], cacheData: any[] = []) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'holdings') {
          return createMockChain({ data: holdings, error: null })
        }
        if (table === 'portfolio_cache') {
          return createMockChain({ data: cacheData, error: null })
        }
        return createMockChain({ data: null, error: null })
      }),
    }
  }

  it('returns empty array when there are no holdings', async () => {
    const mock = buildPortfolioMock([])
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getPortfolio('user-1')

    expect(result).toEqual([])
  })

  it('calculates KRW stock values correctly', async () => {
    const holdings = [
      { ticker: '005930', name: '삼성전자', quantity: 10, avg_price: 70000, currency: 'KRW' },
    ]
    const prices = new Map([
      [
        '005930',
        {
          ticker: '005930',
          price: 75000,
          currency: 'KRW' as const,
          timestamp: Date.now(),
          source: 'kis',
        },
      ],
    ])
    vi.mocked(getStockPrices).mockResolvedValue(prices)

    const mock = buildPortfolioMock(holdings)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getPortfolio('user-1')

    expect(result).toHaveLength(1)
    const item = result[0]!
    expect(item.ticker).toBe('005930')
    expect(item.quantity).toBe(10)
    // avgPrice rounded KRW
    expect(item.avgPrice).toBe(70000)
    // currentPrice = 75000 * 1 (KRW)
    expect(item.currentPrice).toBe(75000)
    // totalValue = 75000 * 10 = 750,000
    expect(item.totalValue).toBe(750000)
    // profit = (75000 - 70000) * 10 = 50,000
    expect(item.profit).toBe(50000)
    // profitPercent = (50000 / 700000) * 100 ≈ 7.14%
    expect(item.profitPercent).toBeCloseTo(7.14, 1)
    expect(item.currency).toBe('KRW')
  })

  it('converts USD stock values to KRW using exchange rate', async () => {
    const holdings = [
      { ticker: 'AAPL', name: 'Apple', quantity: 2, avg_price: 150, currency: 'USD' },
    ]
    const prices = new Map([
      [
        'AAPL',
        {
          ticker: 'AAPL',
          price: 200,
          currency: 'USD' as const,
          timestamp: Date.now(),
          source: 'kis-overseas',
        },
      ],
    ])
    vi.mocked(getStockPrices).mockResolvedValue(prices)

    const mock = buildPortfolioMock(holdings)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getPortfolio('user-1')

    const item = result[0]!
    // avgPrice in KRW = 150 * 1400 = 210,000
    expect(item.avgPrice).toBe(210000)
    // currentPrice in KRW = 200 * 1400 = 280,000
    expect(item.currentPrice).toBe(280000)
    // totalValue = 280,000 * 2 = 560,000
    expect(item.totalValue).toBe(560000)
    // profit = (200 - 150) * 2 * 1400 = 140,000
    expect(item.profit).toBe(140000)
    // profitPercent = (50 / 150) * 100 ≈ 33.33%
    expect(item.profitPercent).toBeCloseTo(33.33, 1)
    expect(item.currency).toBe('USD')
  })

  it('handles CASH holding: quantity = KRW amount, avgPrice = USD amount', async () => {
    const holdings = [
      { ticker: 'CASH', name: '현금', quantity: 1000000, avg_price: 500, currency: 'KRW' },
    ]

    const mock = buildPortfolioMock(holdings)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getPortfolio('user-1')

    const cash = result[0]!
    expect(cash.ticker).toBe('CASH')
    // quantity stays as KRW amount
    expect(cash.quantity).toBe(1000000)
    // avgPrice = usdAmount (for editing)
    expect(cash.avgPrice).toBe(500)
    // totalValue = 1,000,000 + 500 * 1400 = 1,700,000
    expect(cash.totalValue).toBe(1700000)
    expect(cash.profit).toBe(0)
    expect(cash.profitPercent).toBe(0)
  })

  it('calculates portfolio weight as percentage of total KRW value', async () => {
    const holdings = [
      { ticker: '005930', name: '삼성전자', quantity: 10, avg_price: 70000, currency: 'KRW' },
      { ticker: 'AAPL', name: 'Apple', quantity: 1, avg_price: 100, currency: 'USD' },
    ]
    const prices = new Map([
      [
        '005930',
        {
          ticker: '005930',
          price: 100000,
          currency: 'KRW' as const,
          timestamp: Date.now(),
          source: 'kis',
        },
      ],
      [
        'AAPL',
        {
          ticker: 'AAPL',
          price: 100,
          currency: 'USD' as const,
          timestamp: Date.now(),
          source: 'kis-overseas',
        },
      ],
    ])
    vi.mocked(getStockPrices).mockResolvedValue(prices)

    const mock = buildPortfolioMock(holdings)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)

    const result = await provider.getPortfolio('user-1')

    // 삼성전자 totalValue KRW = 100,000 * 10 = 1,000,000
    // AAPL totalValue KRW = 100 * 1 * 1400 = 140,000
    // total = 1,140,000
    const samsung = result.find((i) => i.ticker === '005930')!
    const aapl = result.find((i) => i.ticker === 'AAPL')!

    const total = samsung.totalValue + aapl.totalValue
    expect(samsung.weight).toBeCloseTo((samsung.totalValue / total) * 100, 1)
    expect(aapl.weight).toBeCloseTo((aapl.totalValue / total) * 100, 1)
    // Weights should sum to 100
    expect((samsung.weight ?? 0) + (aapl.weight ?? 0)).toBeCloseTo(100, 1)
  })

  it('falls back to avgPrice when no live price is available for a stock', async () => {
    const holdings = [
      { ticker: '005930', name: '삼성전자', quantity: 5, avg_price: 60000, currency: 'KRW' },
    ]
    // getStockPrices returns empty — price missing, falls back to avg_price
    vi.mocked(getStockPrices).mockResolvedValue(new Map())

    const mock = buildPortfolioMock(holdings, []) // empty cache too
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getPortfolio('user-1')

    const item = result[0]!
    // Fallback: currentPrice = avg_price = 60000
    expect(item.currentPrice).toBe(60000)
    // profit = 0 (same price), profitPercent = 0
    expect(item.profit).toBe(0)
    expect(item.profitPercent).toBe(0)
  })

  it('computes profitPercent = (profit / invested) * 100', async () => {
    const holdings = [
      { ticker: 'MSFT', name: 'Microsoft', quantity: 4, avg_price: 250, currency: 'USD' },
    ]
    const prices = new Map([
      [
        'MSFT',
        {
          ticker: 'MSFT',
          price: 300,
          currency: 'USD' as const,
          timestamp: Date.now(),
          source: 'kis-overseas',
        },
      ],
    ])
    vi.mocked(getStockPrices).mockResolvedValue(prices)

    const mock = buildPortfolioMock(holdings)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getPortfolio('user-1')

    const item = result[0]!
    // profitPercent = ((300 - 250) / 250) * 100 = 20%
    expect(item.profitPercent).toBeCloseTo(20, 1)
  })
})

// ---------------------------------------------------------------------------
// calculateAccountYields (tested indirectly via getMajorIndexYieldComparison)
// ---------------------------------------------------------------------------

describe('StandaloneDataProvider – calculateAccountYields (via getMajorIndexYieldComparison)', () => {
  let provider: StandaloneDataProvider

  beforeEach(() => {
    vi.clearAllMocks()
    provider = new StandaloneDataProvider()
    vi.mocked(getUSDKRWRate).mockResolvedValue(1400)
  })

  const makeMarketData = () => ({
    exchangeRates: new Map<string, number>(),
    gold: new Map<string, number>(),
    bitcoin: new Map<string, number>(),
    realEstate: new Map<string, number>(),
    kospi: new Map([
      ['25.12', 2500],
      ['26.01', 2600],
    ]),
    sp500: new Map([
      ['25.12', 5000],
      ['26.01', 5200],
    ]),
    nasdaq: new Map([
      ['25.12', 18000],
      ['26.01', 19000],
    ]),
    sp500Krw: new Map<string, number>(),
    nasdaqKrw: new Map<string, number>(),
    goldUsd: new Map<string, number>(),
    bitcoinUsd: new Map<string, number>(),
  })

  function buildYieldsMock(snapshots: any[]) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'portfolio_snapshots') {
          return createMockChain({ data: snapshots, error: null })
        }
        return createMockChain({ data: null, error: null })
      }),
    }
  }

  it('returns null when no market data is provided', async () => {
    const mock = buildYieldsMock([])
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMajorIndexYieldComparison('user-1', undefined, undefined)

    expect(result).toBeNull()
  })

  it('yields array starts with 0 (the start point)', async () => {
    const { calculateMarketYields } = await import('../exchange-rate-enrichment')
    vi.mocked(calculateMarketYields).mockReturnValue({
      gold: [0, 5],
      bitcoin: [0, 10],
      realEstate: [0, 2],
      dollar: [0, 3],
      kospi: [0, 4],
      sp500: [0, 6],
      nasdaq: [0, 7],
      sp500Dollar: [0, 8],
      nasdaqDollar: [0, 9],
      goldDollar: [0, 1],
      bitcoinDollar: [0, 11],
    })

    const snapshots = [
      {
        snapshot_date: `${new Date().getFullYear()}-01-31`,
        total_asset: 11000000,
        total_invested: 10000000,
      },
    ]
    const mock = buildYieldsMock(snapshots)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMajorIndexYieldComparison(
      'user-1',
      undefined,
      makeMarketData() as any,
    )

    expect(result).not.toBeNull()
    // account series always starts with 0
    expect(result!.account[0]).toBe(0)
  })

  it('fills null for months before any snapshot data', async () => {
    const { calculateMarketYields } = await import('../exchange-rate-enrichment')
    vi.mocked(calculateMarketYields).mockReturnValue({
      gold: [0, 5, 5],
      bitcoin: [0, 10, 10],
      realEstate: [0, 2, 2],
      dollar: [0, 3, 3],
      kospi: [0, 4, 4],
      sp500: [0, 6, 6],
      nasdaq: [0, 7, 7],
      sp500Dollar: [0, 8, 8],
      nasdaqDollar: [0, 9, 9],
      goldDollar: [0, 1, 1],
      bitcoinDollar: [0, 11, 11],
    })

    // Empty snapshots → all account yields should be null (except start = 0)
    const mock = buildYieldsMock([])
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    // Also mock the fallback account_balances path
    const mockWithBalances = {
      from: vi.fn((table: string) => {
        if (table === 'portfolio_snapshots') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'account_balances') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'deposits') {
          return createMockChain({ data: [], error: null })
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(mockWithBalances as any)

    const result = await provider.getMajorIndexYieldComparison(
      'user-1',
      undefined,
      makeMarketData() as any,
    )

    expect(result).not.toBeNull()
    // account[0] is always 0; remaining are null when no balance data
    expect(result!.account[0]).toBe(0)
    for (let i = 1; i < result!.account.length; i++) {
      expect(result!.account[i]).toBeNull()
    }
  })

  it('calculates snapshot-based yield as (asset - invested) / invested * 100', async () => {
    const { calculateMarketYields } = await import('../exchange-rate-enrichment')
    vi.mocked(calculateMarketYields).mockReturnValue({
      gold: [0, 5],
      bitcoin: [0, 10],
      realEstate: [0, 2],
      dollar: [0, 3],
      kospi: [0, 4],
      sp500: [0, 6],
      nasdaq: [0, 7],
      sp500Dollar: [0, 8],
      nasdaqDollar: [0, 9],
      goldDollar: [0, 1],
      bitcoinDollar: [0, 11],
    })

    const currentYear = new Date().getFullYear()
    const snapshots = [
      // Month 0 (January): 10% yield
      { snapshot_date: `${currentYear}-01-31`, total_asset: 11000000, total_invested: 10000000 },
    ]
    const mock = buildYieldsMock(snapshots)
    vi.mocked(createServiceClient).mockReturnValue(mock as any)

    const result = await provider.getMajorIndexYieldComparison(
      'user-1',
      undefined,
      makeMarketData() as any,
    )

    expect(result).not.toBeNull()
    // account[0] = 0 (start), account[1] = 10.0%
    expect(result!.account[0]).toBe(0)
    expect(result!.account[1]).toBe(10.0)
  })
})
