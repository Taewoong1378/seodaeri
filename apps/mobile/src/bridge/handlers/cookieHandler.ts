import CookieManager from "@react-native-cookies/cookies";
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
  console.log("[CookieHandler] Setting cookie:", {
    cookieName: payload.cookieName,
    domain: payload.domain,
    tokenLength: payload.token?.length,
  });

  try {
    // 쿠키 설정
    await CookieManager.set(payload.domain, {
      name: payload.cookieName,
      value: payload.token,
      domain: new URL(payload.domain).hostname,
      path: "/",
      // 30일
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      secure: true,
      httpOnly: true,
    });

    // __Secure- 없는 버전도 설정 (폴백)
    if (payload.cookieName.startsWith("__Secure-")) {
      const fallbackName = payload.cookieName.replace("__Secure-", "");
      await CookieManager.set(payload.domain, {
        name: fallbackName,
        value: payload.token,
        domain: new URL(payload.domain).hostname,
        path: "/",
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        secure: true,
        httpOnly: true,
      });
      console.log("[CookieHandler] Also set fallback cookie:", fallbackName);
    }

    console.log("[CookieHandler] Cookie set successfully");

    // 현재 쿠키 확인
    const cookies = await CookieManager.get(payload.domain);
    console.log("[CookieHandler] Current cookies:", Object.keys(cookies));

    // WebView에 성공 알림
    const response = { success: true };
    const script = `
      (function() {
        var callbackName = '__setCookieCallback_${messageId}';
        if (typeof window[callbackName] === 'function') {
          window[callbackName](${JSON.stringify(response)});
          delete window[callbackName];
        }
        // 쿠키 설정 후 리다이렉트
        window.location.href = '/dashboard';
      })();
    `;
    webViewRef.current?.injectJavaScript(script);
  } catch (error) {
    console.error("[CookieHandler] Error setting cookie:", error);
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
