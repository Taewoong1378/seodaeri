import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGoalSettings, useSaveGoal } from '../use-goal-settings'

vi.mock('../../app/actions/goal', () => ({
  getGoalSettings: vi.fn(),
  saveGoal: vi.fn(),
}))

vi.mock('../../lib/query-client', () => ({
  queryKeys: {
    goalSettings: ['goalSettings'],
    dashboard: ['dashboard'],
    transactions: ['transactions'],
  },
}))

import { getGoalSettings, saveGoal } from '../../app/actions/goal'

const mockedGetGoalSettings = vi.mocked(getGoalSettings)
const mockedSaveGoal = vi.mocked(saveGoal)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useGoalSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getGoalSettings and returns goal settings data', async () => {
    const mockSettings = {
      finalAssetGoal: 100000000,
      annualDepositGoal: 6000000,
      finalAssetGoals: { '2026': 100000000 },
      annualDepositGoals: { '2026': 6000000 },
    }
    mockedGetGoalSettings.mockResolvedValue(mockSettings)

    const { result } = renderHook(() => useGoalSettings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedGetGoalSettings).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(mockSettings)
  })

  it('returns null when no goal settings exist', async () => {
    mockedGetGoalSettings.mockResolvedValue(null)

    const { result } = renderHook(() => useGoalSettings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
  })

  it('enters error state when getGoalSettings rejects', async () => {
    mockedGetGoalSettings.mockRejectedValue(new Error('fetch error'))

    const { result } = renderHook(() => useGoalSettings(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useSaveGoal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls saveGoal with finalAsset type and amount', async () => {
    mockedSaveGoal.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useSaveGoal(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ type: 'finalAsset', amount: 100000000 })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedSaveGoal).toHaveBeenCalledTimes(1)
    expect(mockedSaveGoal).toHaveBeenCalledWith('finalAsset', 100000000)
  })

  it('calls saveGoal with annualDeposit type and amount', async () => {
    mockedSaveGoal.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useSaveGoal(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ type: 'annualDeposit', amount: 6000000 })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedSaveGoal).toHaveBeenCalledWith('annualDeposit', 6000000)
  })

  it('invalidates goalSettings cache on success', async () => {
    mockedSaveGoal.mockResolvedValue({ success: true })
    mockedGetGoalSettings.mockResolvedValue(null)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSaveGoal(), { wrapper })

    act(() => {
      result.current.mutate({ type: 'finalAsset', amount: 50000000 })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['goalSettings'] }),
    )
  })

  it('enters error state when saveGoal rejects', async () => {
    mockedSaveGoal.mockRejectedValue(new Error('save failed'))

    const { result } = renderHook(() => useSaveGoal(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ type: 'annualDeposit', amount: 3000000 })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
