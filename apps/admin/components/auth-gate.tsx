import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ALLOWED_EMAILS, AUTH_COOKIE } from '@/lib/constants'

export async function AuthGate({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const email = cookieStore.get(AUTH_COOKIE)?.value

  if (!email || !ALLOWED_EMAILS.includes(email)) {
    redirect('/login')
  }

  return <>{children}</>
}

export function getAdminEmail(): string | undefined {
  // For use in other server components - won't redirect
  // Caller needs to handle undefined
  return undefined // will be called with cookies in context
}
