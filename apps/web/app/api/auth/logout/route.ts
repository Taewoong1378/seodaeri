import { auth } from "@repo/auth/server";
import { revokeGoogleToken } from "../../../../lib/google-auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();

    // Google 토큰 해지
    if (session?.accessToken) {
      await revokeGoogleToken(session.accessToken);
    }
    if (session?.refreshToken) {
      await revokeGoogleToken(session.refreshToken);
    }

    // 응답 생성
    const response = NextResponse.json({ success: true });

    // 쿠키 변종 3개 모두 명시적 삭제
    const cookieOptions = "Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

    response.headers.append(
      "Set-Cookie",
      `__Secure-authjs.session-token=; ${cookieOptions}; Secure; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `authjs.session-token=; ${cookieOptions}; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `authjs.callback-url=; ${cookieOptions}; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `authjs.csrf-token=; ${cookieOptions}; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `__Secure-authjs.callback-url=; ${cookieOptions}; Secure; SameSite=Lax`
    );
    response.headers.append(
      "Set-Cookie",
      `__Secure-authjs.csrf-token=; ${cookieOptions}; Secure; SameSite=Lax`
    );

    return response;
  } catch (error) {
    console.error("[Logout] Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
