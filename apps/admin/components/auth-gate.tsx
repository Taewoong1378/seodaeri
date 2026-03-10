import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const ALLOWED_EMAILS = ['xodndxnxn@gmail.com']
const AUTH_COOKIE = 'admin_email'

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
