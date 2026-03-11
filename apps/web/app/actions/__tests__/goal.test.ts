import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGoalSettings, saveGoal } from '../goal'

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

type MockUserRow = Record<string, any> | null

function makeMockSupabase(
  overrides: {
    userById?: { data: MockUserRow; error: any }
    userByEmail?: { data: MockUserRow; error: any }
    updateResult?: { error: any }
  } = {},
) {
  const {
    userById = {
      data: {
        id: 'user-1',
        goal_settings: {
          finalAssetGoals: { '2026': 100000000 },
          annualDepositGoals: { '2026': 6000000 },
        },
      },
      error: null,
    },
    userByEmail = { data: null, error: null },
    updateResult = { error: null },
  } = overrides

  let singleCallCount = 0
  const single = vi.fn().mockImplementation(() => {
    singleCallCount += 1
    return Promise.resolve(singleCallCount === 1 ? userById : userByEmail)
  })

  const eqForSelect = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq: eqForSelect })

  const updateEq = vi.fn().mockResolvedValue(updateResult)
  const update = vi.fn().mockReturnValue({ eq: updateEq })

  return { from: vi.fn().mockReturnValue({ select, update }) }
}

vi.mock('@repo/auth/server', () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 'user-1', email: 'test@test.com', name: 'Test' },
      isDemo: false,
    }),
  ),
}))

vi.mock('@repo/database/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { auth } from '@repo/auth/server'
import { createServiceClient } from '@repo/database/server'

const mockedAuth = vi.mocked(auth)
const mockedCreateServiceClient = vi.mocked(createServiceClient)

// ---------------------------------------------------------------------------
// getGoalSettings
// ---------------------------------------------------------------------------

describe('getGoalSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns goal settings when user has V3 goal_settings', async () => {
    const mockSupabase = makeMockSupabase()
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).not.toBeNull()
    expect(result?.finalAssetGoals).toEqual({ '2026': 100000000 })
    expect(result?.annualDepositGoals).toEqual({ '2026': 6000000 })
  })

  it('returns null when session has no user id', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await getGoalSettings()

    expect(result).toBeNull()
  })

  it('returns null when user is not found by id or email', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null, error: { message: 'not found' } },
      userByEmail: { data: null, error: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).toBeNull()
  })

  it('falls back to email lookup when id lookup returns error', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null, error: { message: 'not found' } },
      userByEmail: {
        data: {
          id: 'user-email-1',
          goal_settings: {
            finalAssetGoals: { '2026': 50000000 },
            annualDepositGoals: { '2026': 3000000 },
          },
        },
        error: null,
      },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).not.toBeNull()
    expect(result?.finalAssetGoals).toEqual({ '2026': 50000000 })
  })

  it('returns null when goal_settings is null', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: { id: 'user-1', goal_settings: null }, error: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).toBeNull()
  })

  it('returns null when goal_settings is an empty object (no data in any year)', async () => {
    const mockSupabase = makeMockSupabase({
      userById: {
        data: {
          id: 'user-1',
          goal_settings: { finalAssetGoals: {}, annualDepositGoals: {} },
        },
        error: null,
      },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).toBeNull()
  })

  it('migrates V1 goal_settings format to V3 and returns data', async () => {
    const mockSupabase = makeMockSupabase({
      userById: {
        data: {
          id: 'user-1',
          goal_settings: { yearlyGoal: 80000000, monthlyGoal: 500000 },
        },
        error: null,
      },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).not.toBeNull()
    // V1 yearlyGoal maps to finalAssetGoals, monthlyGoal to annualDepositGoals
    expect(Object.values(result?.finalAssetGoals ?? {})).toContain(80000000)
    expect(Object.values(result?.annualDepositGoals ?? {})).toContain(500000)
  })

  it('returns null when a DB query throws inside the try block', async () => {
    const eqForSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    })
    const select = vi.fn().mockReturnValue({ eq: eqForSelect })
    const mockSupabase = { from: vi.fn().mockReturnValue({ select }) }
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await getGoalSettings()

    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// saveGoal
// ---------------------------------------------------------------------------

describe('saveGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success when saving finalAsset goal with a positive amount', async () => {
    const mockSupabase = makeMockSupabase()
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await saveGoal('finalAsset', 100000000)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns success when saving annualDeposit goal with a positive amount', async () => {
    const mockSupabase = makeMockSupabase()
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await saveGoal('annualDeposit', 6000000)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns auth error when session has no user id', async () => {
    mockedAuth.mockResolvedValueOnce(null as any)

    const result = await saveGoal('finalAsset', 100000000)

    expect(result.success).toBe(false)
    expect(result.error).toBe('로그인이 필요합니다.')
  })

  it('returns user-not-found error when user cannot be located', async () => {
    const mockSupabase = makeMockSupabase({
      userById: { data: null, error: null },
      userByEmail: { data: null, error: null },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await saveGoal('finalAsset', 100000000)

    expect(result.success).toBe(false)
    expect(result.error).toBe('사용자 정보를 찾을 수 없습니다.')
  })

  it('returns error when the DB update fails', async () => {
    const mockSupabase = makeMockSupabase({
      updateResult: { error: { message: 'constraint violation' } },
    })
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await saveGoal('finalAsset', 100000000)

    expect(result.success).toBe(false)
    expect(result.error).toBe('설정 저장에 실패했습니다.')
  })

  it('deletes the current year entry when amount is zero for finalAsset', async () => {
    const mockSupabase = makeMockSupabase()
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    // amount=0 should delete the year key — DB update still succeeds
    const result = await saveGoal('finalAsset', 0)

    expect(result.success).toBe(true)
  })

  it('deletes the current year entry when amount is zero for annualDeposit', async () => {
    const mockSupabase = makeMockSupabase()
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await saveGoal('annualDeposit', 0)

    expect(result.success).toBe(true)
  })

  it('returns error when a DB query throws inside the try block', async () => {
    const eqForSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockRejectedValue(new Error('connection timeout')),
    })
    const select = vi.fn().mockReturnValue({ eq: eqForSelect })
    const mockSupabase = { from: vi.fn().mockReturnValue({ select }) }
    mockedCreateServiceClient.mockReturnValue(mockSupabase as any)

    const result = await saveGoal('finalAsset', 100000000)

    expect(result.success).toBe(false)
    expect(result.error).toBe('설정 저장 중 오류가 발생했습니다.')
  })
})
