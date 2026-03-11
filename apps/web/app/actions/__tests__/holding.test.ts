import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteHolding, getHoldings, saveHolding } from '../holding'

// ---------------------------------------------------------------------------
// Supabase mock chain factory
// ---------------------------------------------------------------------------

// A terminal builder that is both a thenable and chainable.
// `resolve` controls what { data, error } the awaited result returns.
function makeQueryBuilder(resolve: { data: any; error: any } = { data: null, error: null }) {
  const builder: any = {
    // biome-ignore lint/suspicious/noThenProperty: test mock requires .then for await support
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(resolve).then(onFulfilled, onRejected),
  }
  // Every method returns `this` so chains of arbitrary depth work.
  const chainMethods = ['select', 'eq', 'single', 'insert', 'update', 'delete', 'upsert', 'order']
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder)
  }
  return builder
}

// The mock supabase client – individual tests override `.from` as needed.
let mockSupabase: any

vi.mock('@repo/auth/server', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    }),
  ),
}))

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// google-sheets helpers are never exercised in standalone (no spreadsheet_id) tests,
// but we silence them to avoid import errors.
vi.mock('../../../lib/google-sheets', () => ({
  fetchSheetData: vi.fn(() => Promise.resolve([])),
  batchUpdateSheet: vi.fn(() => Promise.resolve({})),
  deleteSheetRow: vi.fn(() => Promise.resolve({})),
}))

vi.mock('../../../lib/exchange-rate-api', () => ({
  getUSDKRWRate: vi.fn(() => Promise.resolve(1400)),
}))

import { auth } from '@repo/auth/server'
import { revalidatePath } from 'next/cache'

const mockedAuth = vi.mocked(auth)
const mockedRevalidatePath = vi.mocked(revalidatePath)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a supabase mock that returns different results per table. */
function buildSupabase(tableMap: Record<string, { data: any; error: any }>) {
  return {
    from: vi.fn((table: string) => {
      const result = tableMap[table] ?? { data: null, error: null }
      return makeQueryBuilder(result)
    }),
  }
}

// ---------------------------------------------------------------------------
// saveHolding – standalone mode (no spreadsheet_id)
// ---------------------------------------------------------------------------

describe('saveHolding – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('returns success and revalidates paths when upsert succeeds', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      holdings: { data: null, error: null },
    })

    const result = await saveHolding({
      country: '한국',
      ticker: '005930',
      name: '삼성전자',
      quantity: 10,
      avgPrice: 70000,
      currency: 'KRW',
      mode: 'edit',
    })

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/portfolio')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('merges quantity and recalculates avgPrice in add mode when existing holding found', async () => {
    // holdings table: existing record for ticker
    const holdingsBuilder = makeQueryBuilder({
      data: { quantity: 10, avg_price: 60000 },
      error: null,
    })
    const upsertBuilder = makeQueryBuilder({ data: null, error: null })

    let holdingsCallCount = 0
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users')
          return makeQueryBuilder({ data: { id: 'user-1', spreadsheet_id: null }, error: null })
        if (table === 'holdings') {
          holdingsCallCount++
          // first call = select existing, second call = upsert
          return holdingsCallCount === 1 ? holdingsBuilder : upsertBuilder
        }
        return makeQueryBuilder({ data: null, error: null })
      }),
    }

    const result = await saveHolding({
      country: '한국',
      ticker: '005930',
      name: '삼성전자',
      quantity: 10,
      avgPrice: 80000,
      currency: 'KRW',
      // mode defaults to 'add'
    })

    expect(result.success).toBe(true)
  })

  it('returns error when upsert fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      holdings: { data: null, error: { message: 'DB error' } },
    })

    const result = await saveHolding({
      country: '한국',
      ticker: '005930',
      name: '삼성전자',
      quantity: 10,
      avgPrice: 70000,
      currency: 'KRW',
      mode: 'edit',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('종목 저장에 실패했습니다.')
  })

  it('returns auth error when session has no user id', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveHolding({
      country: '한국',
      ticker: '005930',
      name: '삼성전자',
      quantity: 1,
      avgPrice: 70000,
      currency: 'KRW',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns no record', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await saveHolding({
      country: '한국',
      ticker: '005930',
      name: '삼성전자',
      quantity: 1,
      avgPrice: 70000,
      currency: 'KRW',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('returns google-auth error in sheet mode when accessToken is missing', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await saveHolding({
      country: '미국',
      ticker: 'AAPL',
      name: 'Apple',
      quantity: 5,
      avgPrice: 200,
      currency: 'USD',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// deleteHolding – standalone mode
// ---------------------------------------------------------------------------

describe('deleteHolding – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('deletes from DB and revalidates paths on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      holdings: { data: null, error: null },
      portfolio_cache: { data: null, error: null },
    })

    const result = await deleteHolding('005930')

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/portfolio')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('returns error when delete fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      holdings: { data: null, error: { message: 'constraint violation' } },
    })

    const result = await deleteHolding('005930')

    expect(result.success).toBe(false)
    expect(result.error).toBe('종목 삭제에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await deleteHolding('005930')

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await deleteHolding('005930')

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('returns google-auth error in sheet mode when accessToken absent', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await deleteHolding('AAPL')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// getHoldings – standalone mode
// ---------------------------------------------------------------------------

describe('getHoldings – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('returns an empty array when no session', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await getHoldings()

    expect(result).toEqual([])
  })

  it('returns holdings mapped from DB records', async () => {
    const dbHoldings = [
      { ticker: '005930', name: '삼성전자', currency: 'KRW', quantity: 10, avg_price: 70000 },
      { ticker: 'AAPL', name: 'Apple', currency: 'USD', quantity: 5, avg_price: 200 },
    ]
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      holdings: { data: dbHoldings, error: null },
    })

    const result = await getHoldings()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ ticker: '005930', country: '한국', currency: 'KRW' })
    expect(result[1]).toMatchObject({ ticker: 'AAPL', country: '미국', currency: 'USD' })
  })

  it('returns empty array when holdings table has no rows', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      holdings: { data: [], error: null },
    })

    const result = await getHoldings()

    expect(result).toEqual([])
  })

  it('returns empty array when users table has no record', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await getHoldings()

    expect(result).toEqual([])
  })
})
