import { encode } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

interface AppleLoginRequest {
  identityToken: string;
  authorizationCode: string;
  user: string;
  email?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
}

/**
 * Apple 네이티브 로그인 처리
 * 네이티브 앱에서 Apple Sign In 후 identityToken을 받아 세션을 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body: AppleLoginRequest = await request.json();
    const { identityToken, user, email, fullName } = body;

    if (!identityToken || !user) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Apple identityToken 검증 (간단한 구조 확인)
    // 프로덕션에서는 Apple의 공개키로 JWT 검증 필요
    const tokenParts = identityToken.split(".");
    if (tokenParts.length !== 3) {
      return NextResponse.json(
        { error: "Invalid identity token format" },
        { status: 400 }
      );
    }

    // Supabase에 유저 정보 저장/업데이트
    const { createServiceClient } = await import("@repo/database/server");
    const supabase = createServiceClient();

    const userName = fullName
      ? `${fullName.familyName || ""} ${fullName.givenName || ""}`.trim()
      : undefined;

    const userEmail = email || `${user}@privaterelay.appleid.com`;

    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: user,
        email: userEmail,
        name: userName || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("Failed to save Apple user:", upsertError);
      // 유저 저장 실패해도 로그인은 진행
    }

    // 세션 쿠키 이름 결정 (NextAuth v5 규칙)
    // NextAuth v5는 프로덕션(HTTPS)에서 __Secure- 접두사를 사용
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    // next-auth 호환 JWT 토큰 생성
    // ⚠️ 중요: salt는 쿠키 이름과 반드시 동일해야 함!
    const token = await encode({
      token: {
        sub: user, // NextAuth는 'sub' 클레임을 사용
        id: user,
        email: userEmail,
        name: userName,
        provider: "apple",
        accessToken: identityToken,
        accessTokenExpires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30일
        isAppleUser: true,
      },
      secret: process.env.AUTH_SECRET!,
      salt: cookieName, // 쿠키 이름과 동일하게!
      maxAge: 30 * 24 * 60 * 60, // 30일
    });

    // NextResponse를 통해 직접 쿠키 설정 (더 확실한 방법)
    const response = NextResponse.json({
      success: true,
      // WebView에서 쿠키가 안 될 경우를 대비해 토큰도 반환
      token: token,
      cookieName: cookieName,
    });
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax", // WebView 호환성
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30일
    });

    return response;
  } catch (error) {
    console.error("Apple auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
