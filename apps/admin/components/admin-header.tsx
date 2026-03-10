import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function logoutAction() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete('admin_email')
  redirect('/login')
}

export async function AdminHeader() {
  const cookieStore = await cookies()
  const email = cookieStore.get('admin_email')?.value

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">굴림 어드민</h1>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            Dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
