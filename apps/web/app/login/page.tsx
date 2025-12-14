import { AppleLogin, GoogleLogin } from '@repo/auth/components'
import { auth } from '@repo/auth/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: '로그인',
  description: 'Google 계정으로 굴림에 로그인하세요. 투자 기록을 시작하고 배당금 성장을 추적해보세요.',
  robots: {
    index: true,
    follow: true,
  },
}

export default async function LoginPage() {
  const session = await auth()

  // 이미 로그인된 경우 대시보드로 리다이렉트
  if (session?.user) {
    redirect('/dashboard')
  }

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
          <GoogleLogin
            callbackUrl="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-md border bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          />
          <AppleLogin
            className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-900"
          />
        </CardContent>
      </Card>
    </main>
  )
}
