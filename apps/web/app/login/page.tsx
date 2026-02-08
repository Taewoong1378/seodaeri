import { AppleLogin, GoogleLogin } from '@repo/auth/components'
import { auth } from '@repo/auth/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system'
import { AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TestLoginForm } from './TestLoginForm'

export const metadata: Metadata = {
  title: "로그인",
  description:
    "Google 계정으로 굴림에 로그인하세요. 투자 기록을 시작하고 배당금 성장을 추적해보세요.",
  robots: {
    index: true,
    follow: true,
  },
};

// 에러 메시지 매핑
const errorMessages: Record<string, string> = {
  scope_denied:
    "Google Drive 권한이 필요합니다. 로그인 시 모든 권한을 허용해주세요.",
  OAuthSignin: "로그인 중 오류가 발생했습니다. 다시 시도해주세요.",
  OAuthCallback: "로그인 처리 중 오류가 발생했습니다.",
  default: "로그인에 실패했습니다. 다시 시도해주세요.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const params = await searchParams;
  const error = params.error;

  // 이미 로그인된 경우 대시보드로 리다이렉트
  if (session?.user) {
    redirect("/dashboard");
  }

  const errorMessage = error
    ? errorMessages[error] || errorMessages.default
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">로그인</CardTitle>
          <CardDescription>
            Google 계정으로 로그인하여 투자 기록을 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">로그인 실패</p>
                <p className="mt-1 text-destructive/80">{errorMessage}</p>
              </div>
            </div>
          )}
          <GoogleLogin
            callbackUrl="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          />
          <AppleLogin
            className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-900"
          />

          {error === 'scope_denied' && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              굴림은 Google 스프레드시트에 투자 기록을 저장합니다.<br />
              서비스 이용을 위해 Google Drive 권한이 필요합니다.
            </p>
          )}

          {/* 테스트 로그인 폼 (앱스토어 심사용) */}
          {process.env.SHOW_TEST_LOGIN === 'true' && <TestLoginForm />}
        </CardContent>
      </Card>
    </main>
  );
}
