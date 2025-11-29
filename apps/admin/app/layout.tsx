import type { Metadata } from 'next'
import { Toaster } from '@repo/design-system'
import './globals.css'

export const metadata: Metadata = {
  title: '서대리 투자기록 - 관리자',
  description: '서대리 투자기록 앱 관리자 페이지',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
