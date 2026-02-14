import { NextRequest, NextResponse } from "next/server";

/**
 * WebView에서 쿠키가 자동으로 저장되지 않는 경우를 위한 세션 설정 API
 * HTML 페이지를 반환하여 JavaScript로 쿠키를 설정 (iOS WebView 호환)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=no_token", request.url));
  }

  const isProduction = process.env.NODE_ENV === "production";

  // 쿠키 만료 시간 (30일)
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();

  // HTML 페이지에서 JavaScript로 쿠키 설정 후 리다이렉트
  // httpOnly 쿠키는 JavaScript로 설정 불가하므로, 일반 쿠키로 설정
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>로그인 중...</title>
  <style>
    body { 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
    }
    .loader { 
      text-align: center; 
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e0e0e0;
      border-top: 3px solid #333;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>로그인 중...</p>
  </div>
  <script>
    (function() {
      try {
        // 쿠키 설정 (여러 이름으로 시도)
        var token = ${JSON.stringify(token)};
        var expires = ${JSON.stringify(expires)};
        var isProduction = ${isProduction};
        
        // 1. __Secure- 버전 (프로덕션)
        if (isProduction) {
          document.cookie = '__Secure-authjs.session-token=' + encodeURIComponent(token) + '; path=/; expires=' + expires + '; secure; samesite=lax';
        }
        
        // 2. 일반 버전 (항상)
        document.cookie = 'authjs.session-token=' + encodeURIComponent(token) + '; path=/; expires=' + expires + '; samesite=lax';

        console.log('[SetSession] Cookies set, current cookies:', document.cookie.substring(0, 100));
        
        // 약간의 딜레이 후 리다이렉트 (쿠키 저장 대기)
        setTimeout(function() {
          console.log('[SetSession] Redirecting to ${redirect}');
          window.location.replace('${redirect}');
        }, 300);
      } catch(e) {
        console.error('[SetSession] Error:', e);
        window.location.replace('/login?error=cookie_failed');
      }
    })();
  </script>
</body>
</html>
`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Set-Cookie 헤더도 추가 (폴백)
      "Set-Cookie": `authjs.session-token=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`,
    },
  });
}
