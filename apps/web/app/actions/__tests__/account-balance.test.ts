import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteAccountBalance,
  getAccountBalances,
  saveAccountBalance,
  updateAccountBalance,
} from '../account-balance'

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
  fetchSheetData: vi.fn(() => Promise.resolve([])),
  batchUpdateSheet: vi.fn(() => Promise.resolve({})),
  deleteSheetRow: vi.fn(() => Promise.resolve({})),
  appendSheetData: vi.fn(() => Promise.resolve({})),
  extractAccountsFromDeposits: vi.fn(() => []),
}))

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

// ---------------------------------------------------------------------------
// saveAccountBalance – standalone mode
// ---------------------------------------------------------------------------

describe('saveAccountBalance – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('upserts balance and revalidates paths on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: null },
    })

    const result = await saveAccountBalance({ yearMonth: '2024-08', balance: 100000000 })

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('returns error when upsert fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: { message: 'upsert failed' } },
    })

    const result = await saveAccountBalance({ yearMonth: '2024-08', balance: 100000000 })

    expect(result.success).toBe(false)
    expect(result.error).toBe('계좌총액 저장에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveAccountBalance({ yearMonth: '2024-08', balance: 100000000 })

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await saveAccountBalance({ yearMonth: '2024-08', balance: 100000000 })

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

    const result = await saveAccountBalance({ yearMonth: '2024-08', balance: 100000000 })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })

  it('rejects duplicate yearMonth in sheet mode', async () => {
    // fetchSheetData returns a row whose E col (index 3) matches the year
    // and C col (index 1) matches the month number; H col (index 6) is non-zero balance.
    // Row structure for B:H: [B(0), C(1), D(2), E(3), F(4), G(5), H(6)]
    const existingRow = [25, 8, 20248, '2024', '8월', null, 5000000]
    const { fetchSheetData } = await import('../../../lib/google-sheets')
    vi.mocked(fetchSheetData).mockResolvedValueOnce([['header'], existingRow])

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await saveAccountBalance({ yearMonth: '2024-08', balance: 100000000 })

    expect(result.success).toBe(false)
    expect(result.error).toContain('이미 존재합니다')
  })
})

// ---------------------------------------------------------------------------
// deleteAccountBalance – standalone mode
// ---------------------------------------------------------------------------

describe('deleteAccountBalance – standalone mode', () => {
  const deleteInput = { yearMonth: '2024-08', balance: 100000000 }

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
      account_balances: { data: null, error: null },
    })

    const result = await deleteAccountBalance(deleteInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('returns error when DB delete fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: { message: 'delete failed' } },
    })

    const result = await deleteAccountBalance(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('계좌총액 삭제에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await deleteAccountBalance(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await deleteAccountBalance(deleteInput)

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

    const result = await deleteAccountBalance(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// updateAccountBalance – standalone mode
// ---------------------------------------------------------------------------

describe('updateAccountBalance – standalone mode', () => {
  const updateSameMonthInput = {
    originalYearMonth: '2024-08',
    originalBalance: 100000000,
    newYearMonth: '2024-08',
    newBalance: 110000000,
  }

  const updateDiffMonthInput = {
    originalYearMonth: '2024-08',
    originalBalance: 100000000,
    newYearMonth: '2024-09',
    newBalance: 110000000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('updates balance in-place when yearMonth is unchanged', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: null },
    })

    const result = await updateAccountBalance(updateSameMonthInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('replaces record when yearMonth changes', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: null },
    })

    const result = await updateAccountBalance(updateDiffMonthInput)

    expect(result.success).toBe(true)
  })

  it('returns error when in-place update fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: { message: 'update failed' } },
    })

    const result = await updateAccountBalance(updateSameMonthInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('계좌총액 수정에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await updateAccountBalance(updateSameMonthInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await updateAccountBalance(updateSameMonthInput)

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

    const result = await updateAccountBalance(updateSameMonthInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// getAccountBalances – standalone mode
// ---------------------------------------------------------------------------

describe('getAccountBalances – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('returns empty array when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await getAccountBalances()

    expect(result).toEqual([])
  })

  it('returns demo balances when isDemo is true', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'demo', email: 'demo@test.com', name: 'Demo' },
      accessToken: 'demo-token',
      isDemo: true,
    } as any)

    const result = await getAccountBalances()

    expect(result.length).toBeGreaterThan(0)
    // Demo data always has 12 entries
    expect(result).toHaveLength(12)
  })

  it('returns records from DB in standalone mode', async () => {
    const dbRows = [
      { year_month: '2024-08', balance: 100000000 },
      { year_month: '2024-07', balance: 95000000 },
    ]
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: dbRows, error: null },
    })

    const result = await getAccountBalances()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      yearMonth: '2024-08',
      year: 2024,
      month: 8,
      balance: 100000000,
    })
    expect(result[0]?.displayDate).toBe('2024년 8월')
  })

  it('returns empty array when users table has no record', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await getAccountBalances()

    expect(result).toEqual([])
  })

  it('returns empty array when DB query errors', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      account_balances: { data: null, error: { message: 'query failed' } },
    })

    const result = await getAccountBalances()

    expect(result).toEqual([])
  })

  it('returns empty array in sheet mode when accessToken is absent', async () => {
    mockedAuth.mockResolvedValueOnce({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: null,
      isDemo: false,
    } as any)

    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: 'sheet-123' }, error: null },
    })

    const result = await getAccountBalances()

    expect(result).toEqual([])
  })
})
