import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveUser } from '../resolve-user'

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

function makeMockSupabase(
  overrides: {
    userById?: { data: any }
    userByEmail?: { data: any }
  } = {},
) {
  const {
    userById = { data: { id: 'user-1', spreadsheet_id: 'sheet-1' } },
    userByEmail = { data: null },
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

  return { from: vi.fn().mockReturnValue({ select }) }
}

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

import { createServiceClient } from '@repo/database/server'

const mockedCreateServiceClient = vi.mocked(createServiceClient)

// ---------------------------------------------------------------------------
// resolveUser
// ---------------------------------------------------------------------------

describe('resolveUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when session is null', async () => {
    const result = await resolveUser(null)

    expect(result.user).toBeNull()
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
    expect(mockedCreateServiceClient).not.toHaveBeenCalled()
  })

  it('returns error when session.user is null', async () => {
    const result = await resolveUser({ user: null })

    expect(result.user).toBeNull()
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
    expect(mockedCreateServiceClient).not.toHaveBeenCalled()
  })

  it('returns error when session.user.id is undefined', async () => {
    const result = await resolveUser({ user: { id: undefined, email: 'test@test.com' } })

    expect(result.user).toBeNull()
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
    expect(mockedCreateServiceClient).not.toHaveBeenCalled()
  })

  it('returns user found by ID when first lookup succeeds', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: { id: 'user-1', spreadsheet_id: 'sheet-1' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser({ user: { id: 'user-1', email: 'test@test.com' } })

    expect(result.error).toBeNull()
    expect(result.user).toEqual({ id: 'user-1', spreadsheet_id: 'sheet-1' })
  })

  it('falls back to email lookup when ID lookup returns null', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null },
      userByEmail: { data: { id: 'user-email-1', spreadsheet_id: 'sheet-2' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser({ user: { id: 'user-1', email: 'test@test.com' } })

    expect(result.error).toBeNull()
    expect(result.user).toEqual({ id: 'user-email-1', spreadsheet_id: 'sheet-2' })
  })

  it('returns user from email fallback successfully', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null },
      userByEmail: { data: { id: 'user-by-email', spreadsheet_id: 'sheet-3' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser({
      user: { id: 'unknown-id', email: 'fallback@test.com' },
    })

    expect(result.error).toBeNull()
    expect(result.user).toEqual({ id: 'user-by-email', spreadsheet_id: 'sheet-3' })
  })

  it('returns error when both ID and email lookups fail', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null },
      userByEmail: { data: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser({ user: { id: 'user-1', email: 'test@test.com' } })

    expect(result.user).toBeNull()
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('does not attempt email fallback when email is null', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser({ user: { id: 'user-1', email: null } })

    expect(result.user).toBeNull()
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
    // select should only have been called once (ID lookup only)
    expect(mockSupabase.from().select).toHaveBeenCalledTimes(1)
  })

  it('passes custom columns parameter to select()', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: { id: 'user-1', email: 'test@test.com', name: 'Test' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser(
      { user: { id: 'user-1', email: 'test@test.com' } },
      'id, email, name',
    )

    expect(result.error).toBeNull()
    expect(result.user).toEqual({ id: 'user-1', email: 'test@test.com', name: 'Test' })
    expect(mockSupabase.from().select).toHaveBeenCalledWith('id, email, name')
  })

  it("uses default columns 'id, spreadsheet_id' when no columns specified", async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: { id: 'user-1', spreadsheet_id: 'sheet-1' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await resolveUser({ user: { id: 'user-1', email: 'test@test.com' } })

    expect(result.error).toBeNull()
    expect(mockSupabase.from().select).toHaveBeenCalledWith('id, spreadsheet_id')
  })
})
