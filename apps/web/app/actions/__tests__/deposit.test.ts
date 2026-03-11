import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteDeposit,
  getAutoDepositSetting,
  saveAutoDepositSetting,
  saveDeposit,
  updateDeposit,
} from '../deposit'

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

// Silence fetch used by updateDeposit sheet PUT calls
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

// ---------------------------------------------------------------------------
// saveDeposit – standalone mode
// ---------------------------------------------------------------------------

describe('saveDeposit – standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('inserts deposit and revalidates paths on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      deposits: { data: null, error: null },
    })

    const result = await saveDeposit({
      date: '2024-05-01',
      amount: 1000000,
      memo: '월급',
      type: 'DEPOSIT',
      account: '일반계좌1',
    })

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('inserts withdrawal record on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      deposits: { data: null, error: null },
    })

    const result = await saveDeposit({
      date: '2024-05-10',
      amount: 500000,
      memo: '출금',
      type: 'WITHDRAW',
      account: '일반계좌1',
    })

    expect(result.success).toBe(true)
  })

  it('returns error when DB insert fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      deposits: { data: null, error: { message: 'insert failed' } },
    })

    const result = await saveDeposit({
      date: '2024-05-01',
      amount: 1000000,
      memo: '',
      type: 'DEPOSIT',
      account: '일반계좌1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('입출금내역 저장에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveDeposit({
      date: '2024-05-01',
      amount: 1000000,
      memo: '',
      type: 'DEPOSIT',
      account: '일반계좌1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await saveDeposit({
      date: '2024-05-01',
      amount: 1000000,
      memo: '',
      type: 'DEPOSIT',
      account: '일반계좌1',
    })

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

    const result = await saveDeposit({
      date: '2024-05-01',
      amount: 1000000,
      memo: '',
      type: 'DEPOSIT',
      account: '일반계좌1',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// saveAutoDepositSetting
// ---------------------------------------------------------------------------

describe('saveAutoDepositSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('saves setting and returns success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1' }, error: null },
    })

    const result = await saveAutoDepositSetting({
      amount: 500000,
      dayOfMonth: 25,
      memo: '자동이체',
      enabled: true,
    })

    expect(result.success).toBe(true)
  })

  it('returns error when users update fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1' }, error: { message: 'update failed' } },
    })

    const result = await saveAutoDepositSetting({
      amount: 500000,
      dayOfMonth: 25,
      memo: '',
      enabled: false,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('설정 저장에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveAutoDepositSetting({
      amount: 500000,
      dayOfMonth: 1,
      memo: '',
      enabled: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// getAutoDepositSetting
// ---------------------------------------------------------------------------

describe('getAutoDepositSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuth.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      accessToken: 'mock-token',
      isDemo: false,
    } as any)
  })

  it('returns null when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await getAutoDepositSetting()

    expect(result).toBeNull()
  })

  it('returns saved setting when found in DB', async () => {
    const setting = { amount: 500000, dayOfMonth: 25, memo: '자동이체', enabled: true }
    mockSupabase = buildSupabase({
      users: { data: { auto_deposit_settings: setting }, error: null },
    })

    const result = await getAutoDepositSetting()

    expect(result).toEqual(setting)
  })

  it('returns null when user has no setting stored', async () => {
    mockSupabase = buildSupabase({
      users: { data: { auto_deposit_settings: null }, error: null },
    })

    const result = await getAutoDepositSetting()

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// deleteDeposit – standalone mode
// ---------------------------------------------------------------------------

describe('deleteDeposit – standalone mode', () => {
  const deleteInput = {
    date: '2024-05-01',
    type: 'DEPOSIT' as const,
    amount: 1000000,
  }

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
      deposits: { data: null, error: null, count: 1 },
    })

    const result = await deleteDeposit(deleteInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('returns error when DB delete fails', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      deposits: { data: null, error: { message: 'delete failed' } },
    })

    const result = await deleteDeposit(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('입출금내역 삭제에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await deleteDeposit(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await deleteDeposit(deleteInput)

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

    const result = await deleteDeposit(deleteInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})

// ---------------------------------------------------------------------------
// updateDeposit – standalone mode
// ---------------------------------------------------------------------------

describe('updateDeposit – standalone mode', () => {
  const updateInput = {
    originalDate: '2024-05-01',
    originalType: 'DEPOSIT' as const,
    originalAmount: 1000000,
    newDate: '2024-05-05',
    newType: 'DEPOSIT' as const,
    newAmount: 1200000,
    newAccount: '일반계좌1',
    newMemo: '수정된 메모',
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

  it('deletes old record, inserts new record and revalidates on success', async () => {
    mockSupabase = buildSupabase({
      users: { data: { id: 'user-1', spreadsheet_id: null }, error: null },
      deposits: { data: null, error: null },
    })

    const result = await updateDeposit(updateInput)

    expect(result.success).toBe(true)
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(mockedRevalidatePath).toHaveBeenCalledWith('/transactions')
  })

  it('returns error when insert after delete fails', async () => {
    let depositsCallCount = 0
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'users')
          return makeQueryBuilder({ data: { id: 'user-1', spreadsheet_id: null }, error: null })
        if (table === 'deposits') {
          depositsCallCount++
          // first call = delete (succeeds), second call = insert (fails)
          return makeQueryBuilder(
            depositsCallCount === 1
              ? { data: null, error: null }
              : { data: null, error: { message: 'insert failed' } },
          )
        }
        return makeQueryBuilder({ data: null, error: null })
      }),
    }

    const result = await updateDeposit(updateInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('입출금내역 수정에 실패했습니다.')
  })

  it('returns auth error when session is missing', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await updateDeposit(updateInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when users table returns nothing', async () => {
    mockSupabase = buildSupabase({
      users: { data: null, error: null },
    })

    const result = await updateDeposit(updateInput)

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

    const result = await updateDeposit(updateInput)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Google 인증이 필요합니다.')
  })
})
