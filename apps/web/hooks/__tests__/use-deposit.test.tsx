import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountList, useAutoDepositSetting, useSaveAutoDepositSetting } from '../use-deposit'

vi.mock('../../app/actions/deposit', () => ({
  getAccountList: vi.fn(),
  getAutoDepositSetting: vi.fn(),
  saveAutoDepositSetting: vi.fn(),
}))

vi.mock('../../lib/query-client', () => ({
  queryKeys: {
    accountList: ['accountList'],
    autoDepositSetting: ['autoDepositSetting'],
    dashboard: ['dashboard'],
    transactions: ['transactions'],
  },
}))

import {
  getAccountList,
  getAutoDepositSetting,
  saveAutoDepositSetting,
} from '../../app/actions/deposit'

const mockedGetAccountList = vi.mocked(getAccountList)
const mockedGetAutoDepositSetting = vi.mocked(getAutoDepositSetting)
const mockedSaveAutoDepositSetting = vi.mocked(saveAutoDepositSetting)

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAccountList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getAccountList and returns account list data', async () => {
    const mockAccounts = ['일반계좌1', '개인연금1', 'ISA']
    mockedGetAccountList.mockResolvedValue(mockAccounts)

    const { result } = renderHook(() => useAccountList(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedGetAccountList).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(mockAccounts)
  })

  it('returns empty array when getAccountList resolves with no accounts', async () => {
    mockedGetAccountList.mockResolvedValue([])

    const { result } = renderHook(() => useAccountList(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('enters error state when getAccountList rejects', async () => {
    mockedGetAccountList.mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useAccountList(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe('useAutoDepositSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls getAutoDepositSetting and returns setting data', async () => {
    const mockSetting = { amount: 500000, dayOfMonth: 15, memo: '자동입금', enabled: true }
    mockedGetAutoDepositSetting.mockResolvedValue(mockSetting)

    const { result } = renderHook(() => useAutoDepositSetting(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedGetAutoDepositSetting).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual(mockSetting)
  })

  it('returns null when no auto deposit setting is configured', async () => {
    mockedGetAutoDepositSetting.mockResolvedValue(null)

    const { result } = renderHook(() => useAutoDepositSetting(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeNull()
  })
})

describe('useSaveAutoDepositSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls saveAutoDepositSetting with the provided setting', async () => {
    mockedSaveAutoDepositSetting.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useSaveAutoDepositSetting(), {
      wrapper: createWrapper(),
    })

    const setting = { amount: 300000, dayOfMonth: 10, memo: '월급날', enabled: true }

    act(() => {
      result.current.mutate(setting)
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockedSaveAutoDepositSetting).toHaveBeenCalledTimes(1)
    expect(mockedSaveAutoDepositSetting).toHaveBeenCalledWith(setting)
  })

  it('invalidates autoDepositSetting cache on success', async () => {
    mockedSaveAutoDepositSetting.mockResolvedValue({ success: true })
    mockedGetAutoDepositSetting.mockResolvedValue(null)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSaveAutoDepositSetting(), { wrapper })

    act(() => {
      result.current.mutate({ amount: 100000, dayOfMonth: 1, memo: '', enabled: false })
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['autoDepositSetting'] }),
    )
  })

  it('enters error state when saveAutoDepositSetting rejects', async () => {
    mockedSaveAutoDepositSetting.mockRejectedValue(new Error('save failed'))

    const { result } = renderHook(() => useSaveAutoDepositSetting(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ amount: 100000, dayOfMonth: 5, memo: '', enabled: true })
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
