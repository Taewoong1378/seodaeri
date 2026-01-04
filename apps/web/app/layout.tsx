import { SessionProvider } from '@repo/auth/providers'
import { Toaster } from '@repo/design-system'
import type { Metadata, Viewport } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../lib/constants'
import { QueryProvider } from '../lib/query-client'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - 눈덩이처럼 불려가는 내 자산`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    '투자 기록',
    '배당금 추적',
    '포트폴리오 관리',
    '주식 투자',
    '배당 투자',
    '자산 관리',
    '투자 앱',
    '서대리',
    '굴림',
    '복리 투자',
    '눈덩이 효과',
  ],
  authors: [{ name: '굴림', url: SITE_URL }],
  creator: '굴림',
  publisher: '굴림',
  verification: {
    google: 'pLLmKd3TTIiJA8cJ85BUX80bKLuh0G7b3lSgXCnycSk',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - 눈덩이처럼 불려가는 내 자산`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '굴림 - 투자 기록 앱',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - 눈덩이처럼 불려가는 내 자산`,
    description: SITE_DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: SITE_URL,
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
      <body className="overscroll-none bg-[#F5F5F5]" style={{ backgroundColor: '#F5F5F5' }}>
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
