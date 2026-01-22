import type { WebViewRef } from "./types";

interface SetCookiePayload {
  token: string;
  cookieName: string;
  domain: string;
}

export async function handleSetCookie(
  messageId: string,
  webViewRef: WebViewRef,
  payload: SetCookiePayload
): Promise<void> {
  console.log("[CookieHandler] Received payload:", {
    cookieName: payload.cookieName,
    domain: payload.domain,
    tokenLength: payload.token?.length,
  });

  try {
    // 쿠키 설정 대신 URL로 토큰 전달 (가장 확실한 방법)
    // 서버의 /api/auth/set-session 엔드포인트가 쿠키를 설정하고 리다이렉트함
    const baseUrl = payload.domain.replace(/\/$/, ""); // trailing slash 제거
    const redirectUrl = `${baseUrl}/api/auth/set-session?token=${encodeURIComponent(
      payload.token
    )}&redirect=/dashboard`;

    console.log("[CookieHandler] Redirecting to:", redirectUrl.substring(0, 100) + "...");

    // 콜백 호출 먼저
    const response = { success: true };
    const callbackScript = `
      (function() {
        var callbackName = '__setCookieCallback_${messageId}';
        if (typeof window[callbackName] === 'function') {
          window[callbackName](${JSON.stringify(response)});
          delete window[callbackName];
        }
        return true;
      })();
    `;
    webViewRef.current?.injectJavaScript(callbackScript);

    // 약간의 딜레이 후 URL 변경 (콜백 처리 대기)
    setTimeout(() => {
      console.log("[CookieHandler] Now redirecting WebView...");
      // WebView URL을 직접 변경
      const redirectScript = `window.location.href = '${redirectUrl}'; true;`;
      webViewRef.current?.injectJavaScript(redirectScript);
    }, 100);
  } catch (error) {
    console.error("[CookieHandler] Error:", error);
    const response = { success: false, error: String(error) };
    const script = `
      (function() {
        var callbackName = '__setCookieCallback_${messageId}';
        if (typeof window[callbackName] === 'function') {
          window[callbackName](${JSON.stringify(response)});
          delete window[callbackName];
        }
      })();
    `;
    webViewRef.current?.injectJavaScript(script);
  }
}
