import { auth } from '@repo/auth/server'
import { NextResponse, type NextRequest } from 'next/server'

// 인증이 필요한 라우트
const protectedRoutes = ['/dashboard', '/portfolio', '/transactions', '/settings', '/onboarding']

// 로그인된 사용자가 접근하면 안 되는 라우트
const authRoutes = ['/login']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await auth()

  // 보호된 라우트 체크
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  // 인증되지 않은 사용자가 보호된 라우트 접근 시 → 로그인 페이지로
  if (isProtectedRoute && !session?.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 인증된 사용자가 로그인 페이지 접근 시 → 대시보드로
  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 메인 페이지에서 로그인된 사용자 → 대시보드로
  if (pathname === '/' && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - icons (PWA icons)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|icons|.*\\.png$).*)',
  ],
}
