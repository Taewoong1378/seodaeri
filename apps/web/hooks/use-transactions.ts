'use client'

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQueries,
} from '@tanstack/react-query'
import { type AccountBalanceRecord, getAccountBalances } from '../app/actions/account-balance'
import { type DepositInput, type SaveDepositResult, saveDeposit } from '../app/actions/deposit'
import {
  type DividendInput,
  type SaveDividendResult,
  saveDividend,
  saveDividends,
} from '../app/actions/dividend'
import { type SaveTradeResult, type TradeInput, saveTradeTransactions } from '../app/actions/trade'
import {
  type Transaction,
  type TransactionsResult,
  getTransactions,
} from '../app/actions/transactions'
import { queryKeys } from '../lib/query-client'

/**
 * 거래내역을 가져오는 훅
 */
export function useTransactions() {
  return useQuery<TransactionsResult>({
    queryKey: queryKeys.transactions,
    queryFn: () => getTransactions(),
    placeholderData: keepPreviousData,
  })
}

/**
 * 계좌총액 내역을 가져오는 훅
 */
export function useAccountBalances() {
  return useQuery<AccountBalanceRecord[]>({
    queryKey: [...queryKeys.transactions, 'accountBalances'],
    queryFn: () => getAccountBalances(),
    placeholderData: keepPreviousData,
  })
}

/**
 * Suspense 기반 거래내역 + 계좌총액 병렬 조회 훅
 */
export function useSuspenseTransactionData() {
  const [transactions, accountBalances] = useSuspenseQueries({
    queries: [
      {
        queryKey: queryKeys.transactions,
        queryFn: () => deferServerAction(getTransactions),
      },
      {
        queryKey: [...queryKeys.transactions, 'accountBalances'] as const,
        queryFn: () => deferServerAction(getAccountBalances),
      },
    ],
  })
  return {
    transactions: transactions.data,
    accountBalances: accountBalances.data,
  }
}

/**
 * Server Action을 렌더 사이클 밖에서 호출하는 래퍼.
 * useSuspenseQuery/useSuspenseQueries는 캐시 미스 시 렌더 중에 queryFn을 실행하는데,
 * Server Action은 Next.js Router 상태를 업데이트하므로 충돌이 발생한다.
 */
function deferServerAction<T>(action: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => action().then(resolve, reject), 0)
  })
}

/**
 * 입금/출금 저장 뮤테이션
 */
export function useSaveDeposit() {
  const queryClient = useQueryClient()

  return useMutation<SaveDepositResult, Error, DepositInput>({
    mutationFn: (input) => saveDeposit(input),
    onSuccess: (result) => {
      if (result.success) {
        // 트랜잭션 캐시는 즉시 무효화, 대시보드는 백그라운드 리패치
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions, refetchType: 'all' })
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' })
      }
    },
  })
}

/**
 * 배당금 저장 뮤테이션 (단일)
 */
export function useSaveDividend() {
  const queryClient = useQueryClient()

  return useMutation<SaveDividendResult, Error, DividendInput>({
    mutationFn: (input) => saveDividend(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions, refetchType: 'all' })
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' })
      }
    },
  })
}

/**
 * 배당금 저장 뮤테이션 (다중)
 */
export function useSaveDividends() {
  const queryClient = useQueryClient()

  return useMutation<SaveDividendResult, Error, DividendInput[]>({
    mutationFn: (inputs) => saveDividends(inputs),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions, refetchType: 'all' })
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' })
      }
    },
  })
}

/**
 * 거래내역 저장 뮤테이션
 */
export function useSaveTradeTransactions() {
  const queryClient = useQueryClient()

  return useMutation<SaveTradeResult, Error, TradeInput[]>({
    mutationFn: (trades) => saveTradeTransactions(trades),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

/**
 * 거래내역 캐시 무효화 훅
 */
export function useInvalidateTransactions() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
  }
}

// Export types
export type { AccountBalanceRecord } from '../app/actions/account-balance'
export type { Transaction, TransactionsResult } from '../app/actions/transactions'
export type { DepositInput, SaveDepositResult } from '../app/actions/deposit'
export type { DividendInput, SaveDividendResult } from '../app/actions/dividend'
export type { TradeInput, SaveTradeResult } from '../app/actions/trade'
