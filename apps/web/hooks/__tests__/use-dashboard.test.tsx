import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  defaultDashboardData,
  useDashboard,
  useInvalidateDashboard,
  useSyncPortfolio,
} from '../use-dashboard'

vi.mock('../../app/actions/dashboard', () => ({
  getDashboardData: vi.fn(),
  syncPortfolio: vi.fn(),
}))

vi.mock('../../lib/query-client', () => ({
  queryKeys: {
    dashboard: ['dashboard'],
    transactions: ['transactions'],
  },
}))

import { getDashboardData, syncPortfolio } from '../../app/actions/dashboard'

const mockedGetDashboardData = vi.mocked(getDashboardData)
const mockedSyncPortfolio = vi.mocked(syncPortfolio)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial server data when provided', () => {
    const serverData = { ...defaultDashboardData, totalAsset: 5000000 }
    mockedGetDashboardData.mockResolvedValue(serverData)

    const { result } = renderHook(() => useDashboard(serverData), {
      wrapper: createWrapper(),
    })

    // initialData is set synchronously
    expect(result.current.data).toEqual(serverData)
    expect(result.current.data?.totalAsset).toBe(5000000)
  })

  it('calls getDashboardData for client-side fetch when no server data provided', async () => {
    const clientData = { ...defaultDashboardData, totalAsset: 1234 }
    mockedGetDashboardData.mockResolvedValue(clientData)

    const { result } = renderHook(() => useDashboard(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedGetDashboardData).toHaveBeenCalledTimes(1)
    expect(result.current.data?.totalAsset).toBe(1234)
  })
})

describe('useSyncPortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mutation calls syncPortfolio', async () => {
    mockedSyncPortfolio.mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof syncPortfolio>>,
    )

    const { result } = renderHook(() => useSyncPortfolio(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedSyncPortfolio).toHaveBeenCalledTimes(1)
  })

  it('invalidates dashboard cache on success', async () => {
    mockedSyncPortfolio.mockResolvedValue(
      undefined as unknown as Awaited<ReturnType<typeof syncPortfolio>>,
    )
    mockedGetDashboardData.mockResolvedValue(defaultDashboardData)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSyncPortfolio(), { wrapper })

    act(() => {
      result.current.mutate()
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['dashboard'] }))
  })
})

describe('useInvalidateDashboard', () => {
  it('returns a function that invalidates dashboard queries', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useInvalidateDashboard(), { wrapper })

    act(() => {
      result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['dashboard'] }))
  })
})

describe('defaultDashboardData', () => {
  it('has correct default values with all zeros and empty collections', () => {
    expect(defaultDashboardData.totalAsset).toBe(0)
    expect(defaultDashboardData.totalYield).toBe(0)
    expect(defaultDashboardData.totalInvested).toBe(0)
    expect(defaultDashboardData.totalProfit).toBe(0)
    expect(defaultDashboardData.thisMonthDividend).toBe(0)
    expect(defaultDashboardData.yearlyDividend).toBe(0)
    expect(defaultDashboardData.investmentDays).toBe(0)
    expect(defaultDashboardData.monthlyDividends).toEqual([])
    expect(defaultDashboardData.portfolio).toEqual([])
    expect(defaultDashboardData.performanceComparison).toEqual([])
    expect(defaultDashboardData.accountTrend).toEqual([])
    expect(defaultDashboardData.monthlyProfitLoss).toEqual([])
    expect(defaultDashboardData.dividendByYear).toBeNull()
    expect(defaultDashboardData.yearlyDividendSummary).toBeNull()
    expect(defaultDashboardData.rollingAverageDividend).toBeNull()
    expect(defaultDashboardData.cumulativeDividend).toBeNull()
    expect(defaultDashboardData.lastSyncAt).toBeNull()
  })
})
