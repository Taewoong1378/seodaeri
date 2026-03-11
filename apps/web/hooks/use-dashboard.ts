'use client'

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { type DashboardData, getDashboardData, syncPortfolio } from '../app/actions/dashboard'
import { queryKeys } from '../lib/query-client'

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
    refetchOnMount: true, // 다른 페이지에서 invalidate 후 돌아올 때 refetch 필요
  })
}

/**
 * Suspense 기반 대시보드 훅
 * - 캐시에 데이터가 있으면 즉시 반환 (suspend 안 함)
 * - 캐시가 비어있으면 suspend → Suspense fallback(스켈레톤) 표시
 */
export function useSuspenseDashboard() {
  return useSuspenseQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => deferServerAction(getDashboardData),
  })
}

/**
 * Server Action을 렌더 사이클 밖에서 호출하는 래퍼.
 * useSuspenseQuery는 캐시 미스 시 렌더 중에 queryFn을 실행하는데,
 * Server Action은 Next.js Router 상태를 업데이트하므로
 * "Cannot update component while rendering" 에러가 발생한다.
 * setTimeout(0)으로 macrotask로 지연시켜 해결.
 */
function deferServerAction<T>(action: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => action().then(resolve, reject), 0)
  })
}

/**
 * 포트폴리오 동기화 뮤테이션
 */
export function useSyncPortfolio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: syncPortfolio,
    onSuccess: () => {
      // 대시보드 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

/**
 * 대시보드 캐시 무효화 훅
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  }
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
}
