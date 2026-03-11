import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteAccount, restoreAccount } from '../account'

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

function makeMockSupabase(
  overrides: {
    userById?: { data: any; error: any }
    userByEmail?: { data: any; error: any }
    updateResult?: { error: any }
  } = {},
) {
  const {
    userById = { data: { id: 'user-1' }, error: null },
    userByEmail = { data: null, error: null },
    updateResult = { error: null },
  } = overrides

  const singleById = vi.fn().mockResolvedValue(userById)
  const singleByEmail = vi.fn().mockResolvedValue(userByEmail)

  let callCount = 0
  const single = vi.fn().mockImplementation(() => {
    callCount += 1
    return callCount === 1 ? singleById() : singleByEmail()
  })

  const eqChain = { single }
  const eq = vi.fn().mockReturnValue(eqChain)
  const select = vi.fn().mockReturnValue({ eq })

  const updateEq = vi.fn().mockResolvedValue(updateResult)
  const update = vi.fn().mockReturnValue({ eq: updateEq })

  return { from: vi.fn().mockReturnValue({ select, update, eq }) }
}

vi.mock('@repo/auth/server', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      isDemo: false,
    }),
  ),
  signOut: vi.fn(() => Promise.resolve()),
}))

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { auth, signOut } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'

const mockedAuth = vi.mocked(auth)
const mockedSignOut = vi.mocked(signOut)
const mockedCreateServiceClient = vi.mocked(createServiceClient)

// ---------------------------------------------------------------------------
// deleteAccount
// ---------------------------------------------------------------------------

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success and signs out when user is found by id', async () => {
    const mockSupabase = makeMockSupabase()
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await deleteAccount()

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false })
  })

  it('returns auth error when session has no user id', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await deleteAccount()

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
    expect(mockedSignOut).not.toHaveBeenCalled()
  })

  it('falls back to email lookup when user is not found by id', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null, error: null },
      userByEmail: { data: { id: 'user-email-1' }, error: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await deleteAccount()

    expect(result.success).toBe(true)
    expect(mockedSignOut).toHaveBeenCalledWith({ redirect: false })
  })

  it('returns user-not-found error when both id and email lookups fail', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null, error: null },
      userByEmail: { data: null, error: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await deleteAccount()

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
    expect(mockedSignOut).not.toHaveBeenCalled()
  })

  it('returns error when the DB update fails', async () => {
    const mockSupabase = makeMockSupabase({
      updateResult: { error: { message: 'DB error' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await deleteAccount()

    expect(result.success).toBe(false)
    expect(result.error).toBe('회원탈퇴 처리 중 오류가 발생했습니다.')
    expect(mockedSignOut).not.toHaveBeenCalled()
  })

  it('returns error when the DB select throws inside the try block', async () => {
    const eqChain = {
      single: vi.fn().mockRejectedValue(new Error('unexpected DB failure')),
    }
    const eq = vi.fn().mockReturnValue(eqChain)
    const select = vi.fn().mockReturnValue({ eq })
    const mockSupabase = { from: vi.fn().mockReturnValue({ select }) }
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await deleteAccount()

    expect(result.success).toBe(false)
    expect(result.error).toContain('회원탈퇴 실패')
    expect(result.error).toContain('unexpected DB failure')
  })
})

// ---------------------------------------------------------------------------
// restoreAccount
// ---------------------------------------------------------------------------

describe('restoreAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success when account is restored successfully', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    const mockSupabase = { from: vi.fn().mockReturnValue({ update }) }
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await restoreAccount('user-1')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns auth error when session has no user id', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await restoreAccount('user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns error when the DB update fails during restore', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: { message: 'update failed' } })
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    const mockSupabase = { from: vi.fn().mockReturnValue({ update }) }
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await restoreAccount('user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('계정 복구 중 오류가 발생했습니다.')
  })

  it('returns error when the DB update throws inside the try block', async () => {
    const updateEq = vi.fn().mockRejectedValue(new Error('connection refused'))
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    const mockSupabase = { from: vi.fn().mockReturnValue({ update }) }
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await restoreAccount('user-1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('계정 복구 실패')
    expect(result.error).toContain('connection refused')
  })
})
