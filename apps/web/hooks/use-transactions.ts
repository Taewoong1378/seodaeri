'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import { getAccountBalances, type AccountBalanceRecord } from '../app/actions/account-balance';
import { getTransactions, type Transaction, type TransactionsResult } from '../app/actions/transactions';
import { saveDeposit, type DepositInput, type SaveDepositResult } from '../app/actions/deposit';
import { saveDividend, saveDividends, type DividendInput, type SaveDividendResult } from '../app/actions/dividend';
import { saveTradeTransactions, type TradeInput, type SaveTradeResult } from '../app/actions/trade';

/**
 * 거래내역을 가져오는 훅
 */
export function useTransactions() {
  return useQuery<TransactionsResult>({
    queryKey: queryKeys.transactions,
    queryFn: () => getTransactions(),
    staleTime: 60 * 1000, // 60초
    gcTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
  });
}

/**
 * 계좌총액 내역을 가져오는 훅
 */
export function useAccountBalances() {
  return useQuery<AccountBalanceRecord[]>({
    queryKey: [...queryKeys.transactions, 'accountBalances'],
    queryFn: () => getAccountBalances(),
    staleTime: 60 * 1000, // 60초
    gcTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
  });
}

/**
 * 입금/출금 저장 뮤테이션
 */
export function useSaveDeposit() {
  const queryClient = useQueryClient();

  return useMutation<SaveDepositResult, Error, DepositInput>({
    mutationFn: (input) => saveDeposit(input),
    onSuccess: async (result) => {
      // 성공한 경우에만 캐시 무효화 및 즉시 리패치
      if (result.success) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.transactions,
            refetchType: 'all', // 비활성 쿼리도 리패치
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard,
            refetchType: 'all',
          }),
        ]);
      }
    },
  });
}

/**
 * 배당금 저장 뮤테이션 (단일)
 */
export function useSaveDividend() {
  const queryClient = useQueryClient();

  return useMutation<SaveDividendResult, Error, DividendInput>({
    mutationFn: (input) => saveDividend(input),
    onSuccess: async (result) => {
      if (result.success) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.transactions,
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard,
            refetchType: 'all',
          }),
        ]);
      }
    },
  });
}

/**
 * 배당금 저장 뮤테이션 (다중)
 */
export function useSaveDividends() {
  const queryClient = useQueryClient();

  return useMutation<SaveDividendResult, Error, DividendInput[]>({
    mutationFn: (inputs) => saveDividends(inputs),
    onSuccess: async (result) => {
      if (result.success) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.transactions,
            refetchType: 'all',
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.dashboard,
            refetchType: 'all',
          }),
        ]);
      }
    },
  });
}

/**
 * 거래내역 저장 뮤테이션
 */
export function useSaveTradeTransactions() {
  const queryClient = useQueryClient();

  return useMutation<SaveTradeResult, Error, TradeInput[]>({
    mutationFn: (trades) => saveTradeTransactions(trades),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * 거래내역 캐시 무효화 훅
 */
export function useInvalidateTransactions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
  };
}

// Export types
export type { AccountBalanceRecord } from '../app/actions/account-balance';
export type { Transaction, TransactionsResult } from '../app/actions/transactions';
export type { DepositInput, SaveDepositResult } from '../app/actions/deposit';
export type { DividendInput, SaveDividendResult } from '../app/actions/dividend';
export type { TradeInput, SaveTradeResult } from '../app/actions/trade';
