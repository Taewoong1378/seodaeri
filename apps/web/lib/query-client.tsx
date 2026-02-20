'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2분: 서버 캐시(60s)보다 길게 → 불필요한 refetch 방지
        gcTime: 10 * 60 * 1000, // 10분: 페이지 이동 후 돌아와도 캐시 유지
        refetchOnWindowFocus: false, // WebView 포커스 전환이 잦아 비활성화
        refetchOnReconnect: true,
        refetchOnMount: false, // 마운트 시 stale 데이터면 refetch 안 함 (캐시 활용)
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // 서버에서는 항상 새 클라이언트 생성
    return makeQueryClient();
  }
  // 브라우저에서는 싱글톤 사용
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )} */}
    </QueryClientProvider>
  );
}

// Query Keys 상수
export const queryKeys = {
  dashboard: ['dashboard'] as const,
  transactions: ['transactions'] as const,
  accountList: ['accountList'] as const,
  autoDepositSetting: ['autoDepositSetting'] as const,
  sheetConnection: ['sheetConnection'] as const,
  portfolio: ['portfolio'] as const,
  goalSettings: ['goalSettings'] as const,
} as const;
