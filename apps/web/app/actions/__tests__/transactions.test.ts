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

vi.mock('../../../lib/google-sheets', () => ({
  fetchSheetData: vi.fn(() => Promise.resolve(null)),
  parseDepositData: vi.fn(() => []),
  parseDividendData: vi.fn(() => []),
}))

// Demo data mock — used only when isDemo = true
vi.mock('../../../lib/demo-data', () => ({
  DEMO_DIVIDEND_TRANSACTIONS: [
    {
      ticker: 'AAPL',
      name: '애플',
      amountKRW: 50000,
      amountUSD: 35,
      date: '2026-01-15',
    },
    {
      ticker: 'MSFT',
      name: '마이크로소프트',
      amountKRW: 30000,
      amountUSD: 20,
      date: '2026-02-20',
    },
  ],
  DEMO_DEPOSITS: [
    {
      memo: '투자 자금',
      type: 'DEPOSIT',
      amount: 5000000,
      date: '2026-01-05',
      account: '일반 계좌',
    },
    {
      memo: '출금',
      type: 'WITHDRAW',
      amount: 1000000,
      date: '2026-01-10',
      account: '일반 계좌',
    },
  ],
}))

// ---------------------------------------------------------------------------
// Import after mocks are registered
// ---------------------------------------------------------------------------
import { auth } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'
import { getTransactions } from '../transactions'
import type { Transaction } from '../transactions'

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

/** Supabase mock for standalone mode: user has no spreadsheet_id */
function standaloneSupabase(
  opts: {
    userId?: string
    transactions?: any[]
    dividends?: any[]
    deposits?: any[]
  } = {},
) {
  const { userId = 'user-1', transactions = [], dividends = [], deposits = [] } = opts

  return {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return createMockChain({ data: { id: userId, spreadsheet_id: null }, error: null })
      }
      if (table === 'transactions') {
        return createMockChain({ data: transactions, error: null })
      }
      if (table === 'dividends') {
        return createMockChain({ data: dividends, error: null })
      }
      if (table === 'deposits') {
        return createMockChain({ data: deposits, error: null })
      }
      return createMockChain({ data: null, error: null })
    }),
  }
}

/** Supabase mock for sheet mode: user has a spreadsheet_id */
function sheetSupabase(spreadsheetId = 'sheet-abc', transactions: any[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return createMockChain({
          data: { id: 'user-1', spreadsheet_id: spreadsheetId },
          error: null,
        })
      }
      if (table === 'transactions') {
        return createMockChain({ data: transactions, error: null })
      }
      return createMockChain({ data: null, error: null })
    }),
  }
}

// ---------------------------------------------------------------------------
// Tests: auth guard
// ---------------------------------------------------------------------------

describe('getTransactions – auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns failure with Korean auth error when there is no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
    expect(result.transactions).toBeUndefined()
  })

  it('returns failure with auth error when user id is empty string', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: '', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns failure with auth error when user object is missing', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: null,
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// Tests: demo mode
// ---------------------------------------------------------------------------

describe('getTransactions – demo mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success with demo transactions when session.isDemo is true', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo-user', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
    expect(result.transactions).toBeDefined()
    expect(result.transactions!.length).toBeGreaterThan(0)
  })

  it('does not call createServiceClient in demo mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo-user', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    await getTransactions()

    expect(createServiceClient).not.toHaveBeenCalled()
  })

  it('includes DIVIDEND transactions with type DIVIDEND in demo mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    const dividends = result.transactions!.filter((t) => t.type === 'DIVIDEND')
    expect(dividends.length).toBeGreaterThan(0)
  })

  it('includes DEPOSIT and WITHDRAW transactions in demo mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    const deposits = result.transactions!.filter((t) => t.type === 'DEPOSIT')
    const withdraws = result.transactions!.filter((t) => t.type === 'WITHDRAW')
    expect(deposits.length).toBeGreaterThan(0)
    expect(withdraws.length).toBeGreaterThan(0)
  })

  it('returns transactions sorted by trade_date descending in demo mode', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    const dates = result.transactions!.map((t) => new Date(t.trade_date).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]!).toBeLessThanOrEqual(dates[i - 1]!)
    }
  })

  it('maps demo dividend amountKRW to price and total_amount fields', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    const aaplDividend = result.transactions!.find(
      (t) => t.ticker === 'AAPL' && t.type === 'DIVIDEND',
    )
    expect(aaplDividend).toBeDefined()
    expect(aaplDividend!.price).toBe(50000)
    expect(aaplDividend!.total_amount).toBe(50000)
    expect(aaplDividend!.amountKRW).toBe(50000)
    expect(aaplDividend!.amountUSD).toBe(35)
  })

  it('maps demo deposits with source set to sheet', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    const depositTxs = result.transactions!.filter((t) => t.type === 'DEPOSIT')
    for (const tx of depositTxs) {
      expect(tx.source).toBe('sheet')
    }
  })

  it('assigns sequential demo ids for dividend transactions', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'demo', email: 'reviewer@seodaeri.com', name: 'Demo' },
      accessToken: null,
      isDemo: true,
    } as any)

    const result = await getTransactions()

    const divIds = result.transactions!.filter((t) => t.type === 'DIVIDEND').map((t) => t.id)

    expect(divIds.some((id) => id.startsWith('demo-dividend-'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: user not found in DB
// ---------------------------------------------------------------------------

describe('getTransactions – user not found', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns failure with Korean user-not-found error when no user row exists', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'ghost', email: null, name: 'Ghost' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(createMockSupabase({ users: null }) as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('falls back to email lookup and returns failure only when both lookups fail', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'no-id', email: 'also-missing@email.com', name: 'NoOne' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const supa = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          const chain = createMockChain({ data: null, error: null })
          return chain
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(supa as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })
})

// ---------------------------------------------------------------------------
// Tests: standalone mode (no spreadsheet_id)
// ---------------------------------------------------------------------------

describe('getTransactions – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success with isStandalone = true when user has no spreadsheet_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
    expect(result.isStandalone).toBe(true)
  })

  it('returns empty transactions array when all DB tables are empty', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
    expect(result.transactions).toEqual([])
  })

  it('merges app transactions with DB dividend transactions', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const appTx = {
      id: 'app-tx-1',
      ticker: 'AAPL',
      name: '애플',
      type: 'BUY',
      price: 200000,
      quantity: 5,
      total_amount: 1000000,
      trade_date: '2026-01-10',
      sheet_synced: false,
      created_at: '2026-01-10T10:00:00Z',
    }

    const dbDividend = {
      id: 'div-1',
      ticker: 'AAPL',
      name: '애플',
      amount_krw: 50000,
      amount_usd: 35,
      dividend_date: '2026-01-15',
      sheet_synced: false,
      created_at: '2026-01-15T00:00:00Z',
      account: '일반 계좌',
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({
        transactions: [appTx],
        dividends: [dbDividend],
      }) as any,
    )

    const result = await getTransactions()

    expect(result.success).toBe(true)
    expect(result.transactions!.length).toBe(2)

    const buyTx = result.transactions!.find((t) => t.type === 'BUY')
    expect(buyTx).toBeDefined()
    expect(buyTx!.source).toBe('app')

    const divTx = result.transactions!.find((t) => t.type === 'DIVIDEND')
    expect(divTx).toBeDefined()
    expect(divTx!.source).toBe('app')
  })

  it('maps DB dividend fields correctly to Transaction shape', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const dbDividend = {
      id: 'div-uuid-1',
      ticker: 'MSFT',
      name: '마이크로소프트',
      amount_krw: 30000,
      amount_usd: 20,
      dividend_date: '2026-02-01',
      sheet_synced: true,
      created_at: '2026-02-01T00:00:00Z',
      account: '절세 계좌',
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({ dividends: [dbDividend] }) as any,
    )

    const result = await getTransactions()

    const div = result.transactions!.find((t) => t.ticker === 'MSFT')
    expect(div).toBeDefined()
    expect(div!.type).toBe('DIVIDEND')
    expect(div!.amountKRW).toBe(30000)
    expect(div!.amountUSD).toBe(20)
    // price = totalKRW = 30000 + 20 * 1450 (estimatedRate)
    expect(div!.price).toBe(30000 + 20 * 1450)
    expect(div!.total_amount).toBe(30000 + 20 * 1450)
    expect(div!.trade_date).toBe('2026-02-01')
    expect(div!.id).toBe('div-uuid-1')
  })

  it('maps DB deposit fields correctly to Transaction shape', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const dbDeposit = {
      id: 'dep-uuid-1',
      memo: '월급 입금',
      type: 'DEPOSIT',
      amount: 3000000,
      deposit_date: '2026-01-01',
      sheet_synced: false,
      created_at: '2026-01-01T00:00:00Z',
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({ deposits: [dbDeposit] }) as any,
    )

    const result = await getTransactions()

    const dep = result.transactions!.find((t) => t.type === 'DEPOSIT')
    expect(dep).toBeDefined()
    expect(dep!.id).toBe('dep-uuid-1')
    expect(dep!.ticker).toBe('')
    expect(dep!.name).toBe('월급 입금')
    expect(dep!.price).toBe(3000000)
    expect(dep!.total_amount).toBe(3000000)
    expect(dep!.trade_date).toBe('2026-01-01')
    expect(dep!.source).toBe('app')
  })

  it('returns transactions sorted by trade_date descending', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const dividends = [
      {
        id: 'div-a',
        ticker: 'A',
        name: 'A',
        amount_krw: 1000,
        amount_usd: 0,
        dividend_date: '2026-01-01',
        sheet_synced: false,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'div-b',
        ticker: 'B',
        name: 'B',
        amount_krw: 2000,
        amount_usd: 0,
        dividend_date: '2026-03-01',
        sheet_synced: false,
        created_at: '2026-03-01T00:00:00Z',
      },
    ]

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase({ dividends }) as any)

    const result = await getTransactions()

    const dates = result.transactions!.map((t) => new Date(t.trade_date).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]!).toBeLessThanOrEqual(dates[i - 1]!)
    }
  })

  it('handles DB error on dividends query gracefully and still returns success', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const supa = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return createMockChain({ data: { id: 'user-1', spreadsheet_id: null }, error: null })
        }
        if (table === 'transactions') {
          return createMockChain({ data: [], error: null })
        }
        if (table === 'dividends') {
          return createMockChain({ data: null, error: { message: 'DB error' } })
        }
        if (table === 'deposits') {
          return createMockChain({ data: [], error: null })
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(supa as any)

    const result = await getTransactions()

    // Dividend error is logged but does not cause a failure result
    expect(result.success).toBe(true)
    expect(result.transactions).toEqual([])
  })

  it('generates a fallback id when DB dividend row has no id field', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const dbDividend = {
      // no id field
      ticker: 'NOKEY',
      name: 'NoKey',
      amount_krw: 5000,
      amount_usd: 0,
      dividend_date: '2026-02-14',
      sheet_synced: false,
      created_at: '2026-02-14T00:00:00Z',
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({ dividends: [dbDividend] }) as any,
    )

    const result = await getTransactions()

    const div = result.transactions!.find((t) => t.ticker === 'NOKEY')
    expect(div).toBeDefined()
    // id fallback format: db-dividend-{date}-{index}
    expect(div!.id).toMatch(/db-dividend-2026-02-14-0/)
  })
})

// ---------------------------------------------------------------------------
// Tests: sheet mode (spreadsheet_id present)
// ---------------------------------------------------------------------------

describe('getTransactions – sheet mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns isStandalone = false when user has a spreadsheet_id', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
    expect(result.isStandalone).toBe(false)
  })

  it('parses sheet deposit data into DEPOSIT transactions with source = sheet', async () => {
    const { parseDepositData } = await import('../../../lib/google-sheets')
    vi.mocked(parseDepositData).mockReturnValue([
      { date: '2026-01-05', type: 'DEPOSIT', amount: 2000000, memo: '입금', account: '일반 계좌' },
    ] as any)

    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockResolvedValue([['2026-01-05', 'DEPOSIT', '2000000']])

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getTransactions()

    const depositTx = result.transactions!.find((t) => t.type === 'DEPOSIT')
    expect(depositTx).toBeDefined()
    expect(depositTx!.source).toBe('sheet')
    expect(depositTx!.sheet_synced).toBe(true)
  })

  it('parses sheet dividend data into DIVIDEND transactions with source = sheet', async () => {
    const { parseDividendData } = await import('../../../lib/google-sheets')
    vi.mocked(parseDividendData).mockReturnValue([
      {
        date: '2026-01-15',
        ticker: 'AAPL',
        name: '애플',
        amountKRW: 50000,
        amountUSD: 35,
        totalKRW: 100750,
        account: '일반 계좌',
      },
    ] as any)

    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockResolvedValue([['row']])

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getTransactions()

    const divTx = result.transactions!.find((t) => t.type === 'DIVIDEND' && t.ticker === 'AAPL')
    expect(divTx).toBeDefined()
    expect(divTx!.source).toBe('sheet')
    expect(divTx!.sheet_synced).toBe(true)
    expect(divTx!.price).toBe(100750)
    expect(divTx!.total_amount).toBe(100750)
    expect(divTx!.amountKRW).toBe(50000)
    expect(divTx!.amountUSD).toBe(35)
  })

  it('merges app transactions (source=app) with sheet transactions (source=sheet)', async () => {
    const { parseDepositData } = await import('../../../lib/google-sheets')
    vi.mocked(parseDepositData).mockReturnValue([
      { date: '2026-01-05', type: 'DEPOSIT', amount: 1000000, memo: '입금', account: '일반 계좌' },
    ] as any)

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    const appTx = {
      id: 'buy-1',
      ticker: 'MSFT',
      name: '마이크로소프트',
      type: 'BUY',
      price: 400000,
      quantity: 2,
      total_amount: 800000,
      trade_date: '2026-01-20',
      sheet_synced: false,
      created_at: '2026-01-20T00:00:00Z',
    }

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase('sheet-abc', [appTx]) as any)

    const result = await getTransactions()

    const sources = result.transactions!.map((t) => t.source)
    expect(sources).toContain('app')
    expect(sources).toContain('sheet')
  })

  it('continues successfully when sheet fetch returns null (graceful degradation)', async () => {
    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockResolvedValue(null)

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
    // No crash — sheet returned null so no sheet transactions
    expect(result.transactions).toBeDefined()
  })

  it('continues successfully when sheet fetch throws (error caught per-call)', async () => {
    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockRejectedValue(new Error('Sheet API down'))

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'valid-token',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(sheetSupabase() as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tests: Transaction type mapping
// ---------------------------------------------------------------------------

describe('getTransactions – transaction type mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validTypes: Array<Transaction['type']> = ['BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAW']

  it.each(validTypes)('preserves transaction type %s from DB', async (txType) => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const appTx = {
      id: `tx-${txType}`,
      ticker: 'AAPL',
      name: '애플',
      type: txType,
      price: 100000,
      quantity: 1,
      total_amount: 100000,
      trade_date: '2026-01-01',
      sheet_synced: false,
      created_at: '2026-01-01T00:00:00Z',
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({ transactions: [appTx] }) as any,
    )

    const result = await getTransactions()

    const found = result.transactions!.find((t) => t.id === `tx-${txType}`)
    expect(found).toBeDefined()
    expect(found!.type).toBe(txType)
  })

  it('defaults price to 0 when DB row has null price', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const appTx = {
      id: 'null-price',
      ticker: 'XYZ',
      name: null,
      type: 'BUY',
      price: null,
      quantity: null,
      total_amount: null,
      trade_date: null,
      sheet_synced: false,
      created_at: null,
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({ transactions: [appTx] }) as any,
    )

    const result = await getTransactions()

    const tx = result.transactions!.find((t) => t.id === 'null-price')
    expect(tx).toBeDefined()
    expect(tx!.price).toBe(0)
    expect(tx!.quantity).toBe(0)
    expect(tx!.total_amount).toBe(0)
  })

  it('defaults ticker to empty string when DB row has null ticker', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    const appTx = {
      id: 'null-ticker',
      ticker: null,
      name: '이름없음',
      type: 'DEPOSIT',
      price: 500000,
      quantity: 1,
      total_amount: 500000,
      trade_date: '2026-01-01',
      sheet_synced: false,
      created_at: '2026-01-01T00:00:00Z',
    }

    vi.mocked(createServiceClient).mockReturnValue(
      standaloneSupabase({ transactions: [appTx] }) as any,
    )

    const result = await getTransactions()

    const tx = result.transactions!.find((t) => t.id === 'null-ticker')
    expect(tx).toBeDefined()
    expect(tx!.ticker).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Tests: TransactionsResult shape invariants
// ---------------------------------------------------------------------------

describe('getTransactions – result shape invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('success result always contains transactions array and isStandalone boolean', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    vi.mocked(createServiceClient).mockReturnValue(standaloneSupabase() as any)

    const result = await getTransactions()

    expect(result.success).toBe(true)
    expect(Array.isArray(result.transactions)).toBe(true)
    expect(typeof result.isStandalone).toBe('boolean')
    expect(result.error).toBeUndefined()
  })

  it('failure result always contains success=false and error string', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(typeof result.error).toBe('string')
    expect(result.transactions).toBeUndefined()
  })

  it('returns Korean error message on unexpected exception thrown inside the try block', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'tok',
      isDemo: false,
    } as any)

    // createServiceClient is called inside the try block (after user lookup),
    // so we need to make the supabase client throw when .from() is called for
    // 'transactions' — that IS inside the try/catch.
    const supa = {
      from: vi.fn((table: string) => {
        if (table === 'users') {
          return createMockChain({
            data: { id: 'user-1', spreadsheet_id: null },
            error: null,
          })
        }
        if (table === 'transactions') {
          throw new Error('unexpected internal error')
        }
        return createMockChain({ data: null, error: null })
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(supa as any)

    const result = await getTransactions()

    expect(result.success).toBe(false)
    expect(result.error).toBe('거래내역 조회 중 오류가 발생했습니다.')
  })
})
