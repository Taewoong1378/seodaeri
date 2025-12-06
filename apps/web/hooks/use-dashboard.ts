'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/query-client';
import { getDashboardData, syncPortfolio, type DashboardData } from '../app/actions/dashboard';

/**
 * 대시보드 데이터를 가져오는 훅
 */
export function useDashboard() {
  return useQuery<DashboardData | null>({
    queryKey: queryKeys.dashboard,
    queryFn: () => getDashboardData(),
    staleTime: 60 * 1000, // 60초
    gcTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
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
