import { Toaster } from '@repo/design-system'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '굴림(Gulim) - 관리자',
  description: '굴림(Gulim) 앱 관리자 페이지',
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
