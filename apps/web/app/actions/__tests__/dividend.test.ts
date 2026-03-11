import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDividend, saveDividend, saveDividends, updateDividend } from '../dividend'

// ---------------------------------------------------------------------------
// Supabase mock chain factory
// ---------------------------------------------------------------------------

function makeQueryBuilder(resolve: { data?: any; error?: any; count?: any } = {}) {
  const result = { data: null, error: null, count: null, ...resolve }
  const builder: any = {
    // biome-ignore lint/suspicious/noThenProperty: test mock requires .then for await support
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  }
  const chainMethods = ['select', 'eq', 'single', 'insert', 'update', 'delete', 'upsert', 'order']
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder)
  }
  return builder
}

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

vi.mock('../../../lib/google-sheets', () => ({
  appendSheetData: vi.fn(() => Promise.resolve({})),
  deleteSheetRow: vi.fn(() => Promise.resolve({})),
  fetchSheetData: vi.fn(() => Promise.resolve([])),
  batchUpdateSheet: vi.fn(() => Promise.resolve({})),
  extractAccountsFromDeposits: vi.fn(() => []),
}))

vi.mock('../../../lib/exchange-rate-api', () => ({
  getUSDKRWRate: vi.fn(() => Promise.resolve(1400)),
}))

// Silence fetch used by updateDividend for sheet PUT calls
const mockFetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response),
)
vi.stubGlobal('fetch', mockFetch)

import { auth } from '@repo/auth/server'
import { revalidatePath } from 'next/cache'

const mockedAuth = vi.mocked(auth)
const mockedRevalidatePath = vi.mocked(revalidatePath)

function buildSupabase(tableMap: Record<string, { data?: any; error?: any; count?: any }>) {
  return {
    from: vi.fn((table: string) => {
      const result = tableMap[table] ?? { data: null, error: null }
      return makeQueryBuilder(result)
    }),
  }
}

// Minimal valid input fixtures
const dividendInput = {
  date: '2024-03-15',
  ticker: 'AAPL',
  name: 'Apple',
  amountKRW: 0,
  amountUSD: 5.5,
  account: '일반 계좌',
}

// ---------------------------------------------------------------------------
// saveDividend – standalone mode
// ---------------------------------------------------------------------------

describe('saveDividend – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('inserts dividend record and revalidates paths on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      dividends: { data: null, error: null },
    })

    const result = await saveDividend(dividendInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('returns error when DB insert fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      dividends: { data: null, error: { message: 'insert failed' } },
    })

    const result = await saveDividend(dividendInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('배당내역 저장에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveDividend(dividendInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await saveDividend(dividendInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('returns google-auth error in sheet mode when accessToken is absent', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await saveDividend(dividendInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })

  it('returns 401 error message when sheet API throws with 401 code', async () => {
    const { appendSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(appendSheetData).mockRejectedValueOnce({ code: 401, message: '401 Unauthorized' })

    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await saveDividend(dividendInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('인증이 만료되었습니다. 다시 로그인해주세요.')
  })
})

// ---------------------------------------------------------------------------
// saveDividends (batch) – standalone mode
// ---------------------------------------------------------------------------

describe('saveDividends – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('inserts multiple records and revalidates on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      dividends: { data: null, error: null },
    })

    const result = await saveDividends([dividendInput, { ...dividendInput, ticker: 'MSFT' }])

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveDividends([dividendInput])

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns google-auth error when accessToken is missing', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    const result = await saveDividends([dividendInput])

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })

  it('returns error when inputs array is empty', async () => {
    const result = await saveDividends([])

    expect(result.success).toBe(false)
    expect(result.error).toBe('저장할 배당내역이 없습니다.')
  })

  it('returns DB error when batch insert fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      dividends: { data: null, error: { message: 'batch insert failed' } },
    })

    const result = await saveDividends([dividendInput])

    expect(result.success).toBe(false)
    expect(result.error).toBe('배당내역 저장에 실패했습니다.')
  })
})

// ---------------------------------------------------------------------------
// deleteDividend – standalone mode
// ---------------------------------------------------------------------------

describe('deleteDividend – standalone mode', () => {
  const deleteInput = {
    date: '2024-03-15',
    ticker: 'AAPL',
    amountKRW: 0,
    amountUSD: 5.5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('deletes from DB and revalidates on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      dividends: { data: null, error: null, count: 1 },
    })

    const result = await deleteDividend(deleteInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('returns error when DB delete fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      dividends: { data: null, error: { message: 'delete failed' } },
    })

    const result = await deleteDividend(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('배당내역 삭제에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await deleteDividend(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await deleteDividend(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('returns google-auth error in sheet mode when accessToken is absent', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await deleteDividend(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// updateDividend – requires spreadsheet_id (sheet mode only)
// ---------------------------------------------------------------------------

describe('updateDividend – sheet mode', () => {
  const updateInput = {
    originalDate: '2024-03-15',
    originalTicker: 'AAPL',
    originalAmountKRW: 0,
    originalAmountUSD: 5.5,
    newDate: '2024-03-20',
    newTicker: 'AAPL',
    newName: 'Apple Inc',
    newAmountKRW: 0,
    newAmountUSD: 6.0,
    newAccount: '일반 계좌',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as Response)
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await updateDividend(updateInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns google-auth error when accessToken is absent', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    const result = await updateDividend(updateInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })

  it('returns spreadsheet-not-found error when user has no spreadsheet_id', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
    })

    const result = await updateDividend(updateInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('연동된 스프레드시트가 없습니다.')
  })

  it('succeeds when sheet fetch returns empty rows and DB ops complete', async () => {
    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockResolvedValueOnce([])

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
      dividends: { data: null, error: null },
    })

    const result = await updateDividend(updateInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })
})
