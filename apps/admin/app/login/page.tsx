import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ALLOWED_EMAILS, AUTH_COOKIE } from '@/lib/constants'

async function loginAction(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    redirect('/login?error=unauthorized')
  }

  const adminPassword = process.env.ADMIN_PASSWORD ?? 'gulimfighting2026'
  if (!password || password !== adminPassword) {
    redirect('/login?error=wrong-password')
  }

  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  redirect('/')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">관리자 로그인</h1>
        <p className="mb-6 text-sm text-gray-500">허가된 이메일로 로그인하세요</p>

        {error === 'unauthorized' && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            허가되지 않은 이메일입니다
          </div>
        )}
        {error === 'wrong-password' && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            비밀번호가 올바르지 않습니다
          </div>
        )}

        <form action={loginAction}>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="admin@example.com"
            className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="비밀번호를 입력하세요"
            className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}
