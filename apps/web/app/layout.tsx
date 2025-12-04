import { SessionProvider } from '@repo/auth/providers'
import { Toaster } from '@repo/design-system'
import type { Metadata, Viewport } from 'next'
import { QueryProvider } from '../lib/query-client'
import './globals.css'

export const metadata: Metadata = {
  title: '굴림 (Gulim)',
  description: '입력은 1초, 데이터는 평생 - 직장인을 위한 구글 스프레드시트 기반 투자 기록 앱',
  verification: {
    google: 'pLLmKd3TTIiJA8cJ85BUX80bKLuh0G7b3lSgXCnycSk',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '굴림',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="overscroll-none">
        <SessionProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
