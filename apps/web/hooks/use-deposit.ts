'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import {
  getAccountList,
  getAutoDepositSetting,
  saveAutoDepositSetting,
  type AutoDepositSetting,
  type SaveDepositResult,
} from '../app/actions/deposit';

/**
 * 계좌 목록을 가져오는 훅
 */
export function useAccountList() {
  return useQuery<string[]>({
    queryKey: queryKeys.accountList,
    queryFn: () => getAccountList(),
    staleTime: 5 * 60 * 1000, // 5분 (자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분
  });
}

/**
 * 자동 입금 설정을 가져오는 훅
 */
export function useAutoDepositSetting() {
  return useQuery<AutoDepositSetting | null>({
    queryKey: queryKeys.autoDepositSetting,
    queryFn: () => getAutoDepositSetting(),
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 30 * 60 * 1000, // 30분
  });
}

/**
 * 자동 입금 설정 저장 뮤테이션
 */
export function useSaveAutoDepositSetting() {
  const queryClient = useQueryClient();

  return useMutation<SaveDepositResult, Error, AutoDepositSetting>({
    mutationFn: (setting) => saveAutoDepositSetting(setting),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.autoDepositSetting });
    },
  });
}

// Export types
export type { AutoDepositSetting, SaveDepositResult } from '../app/actions/deposit';
