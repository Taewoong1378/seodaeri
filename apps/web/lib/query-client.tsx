'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 기본 stale time: 60초 (서버 캐시와 동일)
        staleTime: 60 * 1000,
        // 가비지 컬렉션 시간: 5분
        gcTime: 5 * 60 * 1000,
        // 창 포커스 시 자동 refetch
        refetchOnWindowFocus: true,
        // 재연결 시 자동 refetch
        refetchOnReconnect: true,
        // 실패 시 3번까지 재시도
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
} as const;
