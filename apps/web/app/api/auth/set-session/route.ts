import { NextRequest, NextResponse } from "next/server";

/**
 * WebView에서 쿠키가 자동으로 저장되지 않는 경우를 위한 세션 설정 API
 * URL 파라미터로 토큰을 받아 Set-Cookie 헤더로 응답
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=no_token", request.url));
  }

  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  // 리다이렉트 응답 생성
  const response = NextResponse.redirect(new URL(redirect, request.url));

  // 쿠키 설정 (다양한 옵션으로 시도)
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax", // 리다이렉트 시에는 lax가 더 호환성 좋음
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30일
  });

  // 추가: non-Secure 버전도 설정 (iOS WebView 호환성)
  if (isProduction) {
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}
