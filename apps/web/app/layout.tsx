import type { Metadata } from 'next'
import { SessionProvider } from '@repo/auth/providers'
import { Toaster } from '@repo/design-system'
import './globals.css'

export const metadata: Metadata = {
  title: '서대리 투자기록',
  description: '입력은 1초, 데이터는 평생 - AI OCR 기반 투자 기록 앱',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
