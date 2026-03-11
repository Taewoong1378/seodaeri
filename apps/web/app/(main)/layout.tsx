import { auth } from '@repo/auth/server'
import { redirect } from 'next/navigation'
import { checkSheetConnection } from '../actions/onboarding'
import { MainProvider } from './providers'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  let sheetUrl: string | null = null
  let isStandalone = false

  if (!session.isDemo) {
    const result = await checkSheetConnection(session)
    if (!result.connected && !result.isStandalone) {
      redirect('/onboarding')
    }
    isStandalone = result.isStandalone || false
    sheetUrl = result.sheetId
      ? `https://docs.google.com/spreadsheets/d/${result.sheetId}/edit`
      : null
  }

  // Admin check
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  const isAdmin =
    adminEmails.length > 0 && !!session.user.email && adminEmails.includes(session.user.email)

  return (
    <MainProvider
      value={{
        user: {
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        },
        isDemo: session.isDemo ?? false,
        sheetUrl,
        isStandalone,
        isAdmin,
      }}
    >
      <div className="min-h-screen bg-background flex justify-center">
        <div className="w-full max-w-[500px] bg-[#020617] min-h-screen relative shadow-2xl overflow-hidden">
          {children}
        </div>
      </div>
    </MainProvider>
  )
}
