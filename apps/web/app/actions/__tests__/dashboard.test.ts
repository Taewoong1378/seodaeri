import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock all external dependencies before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('@repo/auth/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn: (...args: any[]) => any) => fn),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('../../../lib/alternative-asset-api', () => ({
  ALTERNATIVE_ASSET_CODES: new Set<string>([]),
  getAlternativeAssetPrices: vi.fn(() => Promise.resolve([])),
}))

// StandaloneDataProvider mock: we capture a single instance reference so
// individual tests can override method return values via mockResolvedValue.
// The constructor function must be a real function (not an arrow) so that
// `new StandaloneDataProvider()` works correctly.
let mockProviderInstance: {
  getDashboardSummary: ReturnType<typeof vi.fn>
  getPortfolio: ReturnType<typeof vi.fn>
  getMonthlyProfitLoss: ReturnType<typeof vi.fn>
  getMajorIndexYieldComparison: ReturnType<typeof vi.fn>
  getAccountTrend: ReturnType<typeof vi.fn>
  getDividends: ReturnType<typeof vi.fn>
}

function buildDefaultProviderInstance() {
  return {
    getDashboardSummary: vi.fn(() =>
      Promise.resolve({
        totalAsset: 10000000,
        totalYield: 5,
        totalInvested: 9523810,
        totalProfit: 476190,
        thisMonthDividend: 50000,
        yearlyDividend: 300000,
        investmentDays: 365,
      }),
    ),
    getPortfolio: vi.fn(() => Promise.resolve([])),
    getMonthlyProfitLoss: vi.fn(() => Promise.resolve([])),
    getMajorIndexYieldComparison: vi.fn(() => Promise.resolve(null)),
    getAccountTrend: vi.fn(() => Promise.resolve([])),
    getDividends: vi.fn(() => Promise.resolve([])),
  }
}

// Initialise once at module scope
mockProviderInstance = buildDefaultProviderInstance()

vi.mock('../../../lib/data-provider', () => ({
  // Use a named regular function so `new` works properly
  StandaloneDataProvider: vi.fn(function StandaloneDataProviderMock(this: any) {
    Object.assign(this, mockProviderInstance)
  }),
}))

vi.mock('../../../lib/exchange-rate-api', () => ({
  getUSDKRWRate: vi.fn(() => Promise.resolve(1400)),
}))

vi.mock('../../../lib/exchange-rate-enrichment', () => ({
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
  enrichRowsWithExchangeRates: vi.fn((rows: any) => rows),
}))

vi.mock('../../../lib/google-sheets', () => ({
  fetchSheetData: vi.fn(() => Promise.resolve(null)),
  parseAccountSummary: vi.fn(() => ({
    totalAsset: 0,
    totalYield: 0,
    totalInvested: 0,
    totalProfit: 0,
  })),
  parseDividendData: vi.fn(() => []),
  parseDepositData: vi.fn(() => []),
  parsePortfolioData: vi.fn(() => []),
  parsePerformanceComparisonData: vi.fn(() => []),
  parseAccountTrendData: vi.fn(() => []),
  parseMonthlyProfitLoss: vi.fn(() => []),
  parseYieldComparisonData: vi.fn(() => null),
  parseYieldComparisonDollarData: vi.fn(() => null),
  parseMonthlyYieldComparisonWithDollar: vi.fn(() => null),
  parseMonthlyYieldComparisonDollarApplied: vi.fn(() => null),
  parseMajorIndexYieldComparison: vi.fn(() => null),
  parseMajorIndexYieldComparisonData: vi.fn(() => null),
  aggregateMonthlyDividends: vi.fn(() => []),
  aggregateDividendsByYear: vi.fn(() => null),
  aggregateYearlyDividends: vi.fn(() => null),
  calculateRollingAverageDividend: vi.fn(() => null),
  calculateCumulativeDividend: vi.fn(() => null),
  computeDividendAccountData: vi.fn(() => ({})),
}))

vi.mock('../../../lib/historical-exchange-rate', () => ({
  getHistoricalExchangeRates: vi.fn(() => Promise.resolve(null)),
  getHistoricalMarketData: vi.fn(() => Promise.resolve(null)),
}))

// Demo data mock — used only when isDemo = true
vi.mock('../../../lib/demo-data', () => ({
  DEMO_DASHBOARD_DATA: {
    totalAsset: 99999999,
    totalYield: 42.0,
    totalInvested: 70000000,
    totalProfit: 29999999,
    thisMonthDividend: 100000,
    yearlyDividend: 1200000,
    monthlyDividends: [],
    dividendByYear: null,
    yearlyDividendSummary: null,
    rollingAverageDividend: null,
    cumulativeDividend: null,
    portfolio: [],
    performanceComparison: [],
    accountTrend: [],
    monthlyProfitLoss: [],
    yieldComparison: null,
    yieldComparisonDollar: null,
    monthlyYieldComparison: null,
    monthlyYieldComparisonDollarApplied: null,
    majorIndexYieldComparison: null,
    investmentDays: 999,
    lastSyncAt: '2026-01-01T00:00:00.000Z',
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------
import { auth } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'
import { getDashboardData } from '../dashboard'

// ---------------------------------------------------------------------------
// Supabase mock helpers (mirrors data-provider.test.ts convention)
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
  // biome-ignore lint/suspicious/noThenProperty: intentional - makes mock chain awaitable
  ;(chain as any).then = (resolve: (v: any) => any) => Promise.resolve(resolvedValue).then(resolve)
  return chain
}

function createMockSupabase(tableData: Record<string, any> = {}) {
  return {
    from: vi.fn((table: string) => {
      const resolved =
        table in tableData ? { data: tableData[table], error: null } : { data: null, error: null }
      return createMockChain(resolved)
    }),
  }
}

/** Supabase returning a standalone user (no spreadsheet_id) */
function standaloneSupabase(userId = 'user-1') {
  return createMockSupabase({
    users: { id: userId, spreadsheet_id: null },
  })
}

/** Supabase returning a user with a spreadsheet_id (sheet mode) */
function sheetSupabase(spreadsheetId = 'sheet-abc') {
  return createMockSupabase({
    users: { id: 'user-1', spreadsheet_id: spreadsheetId },
  })
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('getDashboardData – auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProviderInstance = buildDefaultProviderInstance()
  })

  it('returns null when there is no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const result = await getDashboardData()

    expect(result).toBeNull()
  })

  it('returns null when session exists but user id is empty string', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: '', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const result = await getDashboardData()

    expect(result).toBeNull()
  })
})

describe('getDashboardData – demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProviderInstance = buildDefaultProviderInstance()
  })

  it('returns DEMO_DASHBOARD_DATA when session.isDemo is true', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo-user', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    // Sentinel value from the DEMO_DASHBOARD_DATA mock above
    expect(result!.totalAsset).toBe(99999999)
    expect(result!.totalYield).toBe(42.0)
    expect(result!.investmentDays).toBe(999)
  })

  it('does not call createServiceClient in demo mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo-user', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    await getDashboardData()

    expect(createServiceClient).not.toHaveBeenCalled()
  })
})

describe('getDashboardData – user not found in DB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProviderInstance = buildDefaultProviderInstance()
  })

  it('returns zeroed-out DashboardData when user row is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'unknown-user', email: null, name: 'Ghost' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(createMockSupabase({ users: null }) as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    expect(result!.totalAsset).toBe(0)
    expect(result!.totalInvested).toBe(0)
    expect(result!.totalProfit).toBe(0)
    expect(result!.totalYield).toBe(0)
    expect(result!.portfolio).toEqual([])
    expect(result!.monthlyDividends).toEqual([])
    expect(result!.investmentDays).toBe(0)
    expect(result!.lastSyncAt).toBeNull()
  })

  it('falls back to email lookup and proceeds when id lookup returns null', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'uuid-not-in-db', email: 'found@email.com', name: 'User' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    // id-lookup returns null, email-lookup returns a standalone user
    let callCount = 0
    const supa = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          const chain = createMockChain({ data: null, error: null })
          chain.single = vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve({ data: null, error: null })
            return Promise.resolve({
              data: { id: 'email-user-id', spreadsheet_id: null },
              error: null,
            })
          })
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(supa as any)

    const result = await getDashboardData()

    // Standalone mode was triggered — result is not null
    expect(result).not.toBeNull()
  })
})

describe('getDashboardData – standalone mode (no spreadsheet_id)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Rebuild the mock instance after clearAllMocks resets the fns
    mockProviderInstance = buildDefaultProviderInstance()
  })

  it('delegates to getStandaloneDashboardData and returns a DashboardData object', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    // The function assembles DashboardData from the provider; at minimum these
    // fields should be present and numeric.
    expect(typeof result!.totalAsset).toBe('number')
    expect(typeof result!.totalYield).toBe('number')
    expect(Array.isArray(result!.portfolio)).toBe(true)
    expect(Array.isArray(result!.monthlyProfitLoss)).toBe(true)
  })

  it('returns empty portfolio and null majorIndexYieldComparison when provider returns empty data', async () => {
    mockProviderInstance.getPortfolio.mockResolvedValue([])
    mockProviderInstance.getMajorIndexYieldComparison.mockResolvedValue(null)
    mockProviderInstance.getDashboardSummary.mockResolvedValue({
      totalAsset: 0,
      totalYield: 0,
      totalInvested: 0,
      totalProfit: 0,
      thisMonthDividend: 0,
      yearlyDividend: 0,
      investmentDays: 0,
    })

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    expect(result!.portfolio).toEqual([])
    expect(result!.monthlyProfitLoss).toEqual([])
    expect(result!.majorIndexYieldComparison).toBeNull()
  })

  it('sets lastSyncAt to a non-null ISO string', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getDashboardData()

    expect(result!.lastSyncAt).not.toBeNull()
    // Should be a valid ISO date string
    expect(() => new Date(result!.lastSyncAt!).toISOString()).not.toThrow()
  })
})

describe('getDashboardData – sheet mode (spreadsheet_id present)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProviderInstance = buildDefaultProviderInstance()
  })

  it('falls back to standalone when accessToken is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null, // no token → triggers standalone fallback
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getDashboardData()

    // Standalone returns a DashboardData object (not null)
    expect(result).not.toBeNull()
    expect(typeof result!.totalAsset).toBe('number')
    expect(Array.isArray(result!.portfolio)).toBe(true)
  })

  it('returns a DashboardData object with sheet-parsed values when accessToken is present', async () => {
    const { parseAccountSummary, parseDividendData } = await import('../../../lib/google-sheets')
    vi.mocked(parseAccountSummary).mockReturnValue({
      totalAsset: 50000000,
      totalYield: 12.5,
      totalInvested: 45000000,
      totalProfit: 5000000,
    })
    vi.mocked(parseDividendData).mockReturnValue([])

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    expect(typeof result!.totalAsset).toBe('number')
    expect(typeof result!.investmentDays).toBe('number')
    expect(Array.isArray(result!.portfolio)).toBe(true)
  })

  it('returns fallback DashboardData (not null) when sheet fetch rejects with a network error', async () => {
    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockRejectedValue(new Error('network error'))

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    // Provide a portfolio_cache so the error-path can still return data
    const mockSupa = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return createMockChain({
            data: { id: 'user-1', spreadsheet_id: 'sheet-abc' },
            error: null,
          })
        }
        if (table === 'portfolio_cache') {
          return createMockChain({ data: [], error: null })
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(mockSupa as any)

    const result = await getDashboardData()

    // Should not throw — returns a DashboardData object either way
    expect(result).not.toBeNull()
    expect(typeof result!.totalAsset).toBe('number')
    expect(typeof result!.totalYield).toBe('number')
    expect(Array.isArray(result!.portfolio)).toBe(true)
  })
})

describe('getDashboardData – DashboardData shape invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProviderInstance = buildDefaultProviderInstance()
  })

  it('always includes all required DashboardData fields in standalone mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    const requiredFields = [
      'totalAsset',
      'totalYield',
      'totalInvested',
      'totalProfit',
      'thisMonthDividend',
      'yearlyDividend',
      'monthlyDividends',
      'dividendByYear',
      'yearlyDividendSummary',
      'rollingAverageDividend',
      'cumulativeDividend',
      'portfolio',
      'performanceComparison',
      'accountTrend',
      'monthlyProfitLoss',
      'yieldComparison',
      'yieldComparisonDollar',
      'monthlyYieldComparison',
      'monthlyYieldComparisonDollarApplied',
      'majorIndexYieldComparison',
      'investmentDays',
      'lastSyncAt',
    ]
    for (const field of requiredFields) {
      expect(result, `field "${field}" should exist`).toHaveProperty(field)
    }
  })

  it('always includes all required DashboardData fields in demo mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getDashboardData()

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('totalAsset')
    expect(result).toHaveProperty('portfolio')
    expect(result).toHaveProperty('investmentDays')
  })

  it('returns zero-value DashboardData (not null) when user is not found', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'ghost', email: null, name: 'Ghost' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(createMockSupabase({ users: null }) as any)

    const result = await getDashboardData()

    // Returns zeroed object, NOT null
    expect(result).not.toBeNull()
    expect(result!.totalAsset).toBe(0)
    expect(result!.portfolio).toEqual([])
  })
})
