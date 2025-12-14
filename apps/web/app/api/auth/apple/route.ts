import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'

interface AppleLoginRequest {
  identityToken: string
  authorizationCode: string
  user: string
  email?: string
  fullName?: {
    givenName?: string
    familyName?: string
  }
}

/**
 * Apple 네이티브 로그인 처리
 * 네이티브 앱에서 Apple Sign In 후 identityToken을 받아 세션을 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body: AppleLoginRequest = await request.json()
    const { identityToken, user, email, fullName } = body

    if (!identityToken || !user) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Apple identityToken 검증 (간단한 구조 확인)
    // 프로덕션에서는 Apple의 공개키로 JWT 검증 필요
    const tokenParts = identityToken.split('.')
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid identity token format' },
        { status: 400 }
      )
    }

    // Supabase에 유저 정보 저장/업데이트
    const { createServiceClient } = await import('@repo/database/server')
    const supabase = createServiceClient()

    const userName = fullName
      ? `${fullName.familyName || ''} ${fullName.givenName || ''}`.trim()
      : undefined

    const userEmail = email || `${user}@privaterelay.appleid.com`

    const { error: upsertError } = await supabase.from('users').upsert(
      {
        id: user,
        email: userEmail,
        name: userName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (upsertError) {
      console.error('Failed to save Apple user:', upsertError)
      // 유저 저장 실패해도 로그인은 진행
    }

    // next-auth 호환 JWT 토큰 생성
    const token = await encode({
      token: {
        id: user,
        email: userEmail,
        name: userName,
        provider: 'apple',
        accessToken: identityToken,
        accessTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
      },
      secret: process.env.AUTH_SECRET!,
      maxAge: 30 * 24 * 60 * 60, // 30일
    })

    // 세션 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set('authjs.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30일
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Apple auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
