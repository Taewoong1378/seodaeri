import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useInvalidateTransactions,
  useSaveDeposit,
  useSaveDividend,
  useTransactions,
} from '../use-transactions'

vi.mock('../../app/actions/transactions', () => ({
  getTransactions: vi.fn(),
}))
vi.mock('../../app/actions/deposit', () => ({
  saveDeposit: vi.fn(),
}))
vi.mock('../../app/actions/dividend', () => ({
  saveDividend: vi.fn(),
  saveDividends: vi.fn(),
}))
vi.mock('../../app/actions/trade', () => ({
  saveTradeTransactions: vi.fn(),
}))
vi.mock('../../app/actions/account-balance', () => ({
  getAccountBalances: vi.fn(),
}))
vi.mock('../../lib/query-client', () => ({
  queryKeys: {
    dashboard: ['dashboard'],
    transactions: ['transactions'],
  },
}))

import { saveDeposit } from '../../app/actions/deposit'
import { saveDividend } from '../../app/actions/dividend'
import { getTransactions } from '../../app/actions/transactions'

const mockedGetTransactions = vi.mocked(getTransactions)
const mockedSaveDeposit = vi.mocked(saveDeposit)
const mockedSaveDividend = vi.mocked(saveDividend)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useTransactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns data from getTransactions', async () => {
    const mockResult = {
      success: true,
      transactions: [],
    }
    mockedGetTransactions.mockResolvedValue(mockResult)

    const { result } = renderHook(() => useTransactions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedGetTransactions).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(mockResult)
  })
})

describe('useSaveDeposit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('success invalidates both transactions and dashboard caches', async () => {
    mockedSaveDeposit.mockResolvedValue({ success: true })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSaveDeposit(), { wrapper })

    act(() => {
      result.current.mutate({
        date: '2025-01-01',
        amount: 100000,
        memo: '입금',
        type: 'DEPOSIT',
        account: '일반',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedSaveDeposit).toHaveBeenCalledTimes(1)

    const calledKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown }).queryKey,
    )
    expect(calledKeys).toContainEqual(['transactions'])
    expect(calledKeys).toContainEqual(['dashboard'])
  })
})

describe('useSaveDividend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('success invalidates both transactions and dashboard caches', async () => {
    mockedSaveDividend.mockResolvedValue({ success: true })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSaveDividend(), { wrapper })

    act(() => {
      result.current.mutate({
        date: '2025-01-15',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        amountKRW: 13500,
        amountUSD: 10,
        account: '일반 계좌',
      })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedSaveDividend).toHaveBeenCalledTimes(1)

    const calledKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: unknown }).queryKey,
    )
    expect(calledKeys).toContainEqual(['transactions'])
    expect(calledKeys).toContainEqual(['dashboard'])
  })
})

describe('useInvalidateTransactions', () => {
  it('returns a function that invalidates transactions queries', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useInvalidateTransactions(), {
      wrapper,
    })

    act(() => {
      result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['transactions'] }),
    )
  })
})
