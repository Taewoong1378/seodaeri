'use client';

import { useQuery, useSuspenseQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import { getDashboardData, syncPortfolio, type DashboardData } from '../app/actions/dashboard';

/**
 * 대시보드 데이터를 가져오는 훅 (SSR initialData 지원)
 */
export function useDashboard(serverData?: DashboardData | null) {
  return useQuery<DashboardData | null>({
    queryKey: queryKeys.dashboard,
    queryFn: () => getDashboardData(),
    placeholderData: keepPreviousData,
    initialData: serverData ?? undefined,
    initialDataUpdatedAt: serverData ? Date.now() : undefined,
  });
}

/**
 * Suspense 기반 대시보드 훅
 * - 캐시에 데이터가 있으면 즉시 반환 (suspend 안 함)
 * - 캐시가 비어있으면 suspend → Suspense fallback(스켈레톤) 표시
 */
export function useSuspenseDashboard() {
  return useSuspenseQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => getDashboardData(),
  });
}

/**
 * 포트폴리오 동기화 뮤테이션
 */
export function useSyncPortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncPortfolio,
    onSuccess: () => {
      // 대시보드 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/**
 * 대시보드 캐시 무효화 훅
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

// 기본 대시보드 데이터
export const defaultDashboardData: DashboardData = {
  totalAsset: 0,
  totalYield: 0,
  totalInvested: 0,
  totalProfit: 0,
  thisMonthDividend: 0,
  yearlyDividend: 0,
  monthlyDividends: [],
  dividendByYear: null,
  yearlyDividendSummary: null,
  rollingAverageDividend: null,
  cumulativeDividend: null,
  portfolio: [],
  performanceComparison: [],
  accountTrend: [],
  monthlyProfitLoss: [],
  yieldComparison: null,
  yieldComparisonDollar: null,
  monthlyYieldComparison: null,
  monthlyYieldComparisonDollarApplied: null,
  majorIndexYieldComparison: null,
  investmentDays: 0,
  lastSyncAt: null,
};
