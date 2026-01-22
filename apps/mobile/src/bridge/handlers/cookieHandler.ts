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
  // 도메인에서 www 제거하고 .으로 시작하게 (서브도메인 모두 허용)
  const hostname = new URL(payload.domain).hostname;
  const cookieDomain = hostname.startsWith("www.")
    ? hostname.replace("www.", ".")
    : "." + hostname;

  console.log("[CookieHandler] Setting cookie:", {
    cookieName: payload.cookieName,
    domain: payload.domain,
    cookieDomain: cookieDomain,
    tokenLength: payload.token?.length,
  });

  try {
    // 쿠키 설정 - 여러 변형으로 시도
    const cookieOptions = {
      value: payload.token,
      path: "/",
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      secure: true,
      httpOnly: false, // JavaScript에서 접근 가능하게 (디버깅용)
    };

    // 1. 정확한 hostname으로 설정
    await CookieManager.set(payload.domain, {
      name: payload.cookieName,
      domain: hostname,
      ...cookieOptions,
    });
    console.log("[CookieHandler] Set cookie with domain:", hostname);

    // 2. .domain 형식으로도 설정 (서브도메인 호환)
    await CookieManager.set(payload.domain, {
      name: payload.cookieName,
      domain: cookieDomain,
      ...cookieOptions,
    });
    console.log("[CookieHandler] Set cookie with domain:", cookieDomain);

    // 3. __Secure- 없는 버전도 설정 (폴백)
    if (payload.cookieName.startsWith("__Secure-")) {
      const fallbackName = payload.cookieName.replace("__Secure-", "");
      await CookieManager.set(payload.domain, {
        name: fallbackName,
        domain: hostname,
        ...cookieOptions,
      });
      await CookieManager.set(payload.domain, {
        name: fallbackName,
        domain: cookieDomain,
        ...cookieOptions,
      });
      console.log("[CookieHandler] Also set fallback cookie:", fallbackName);
    }

    console.log("[CookieHandler] Cookie set successfully");

    // 쿠키를 디스크에 동기화 (iOS에서 중요!)
    await CookieManager.flush();
    console.log("[CookieHandler] Cookies flushed to disk");

    // 현재 쿠키 확인
    const cookies = await CookieManager.get(payload.domain);
    console.log("[CookieHandler] Current cookies:", Object.keys(cookies));
    console.log("[CookieHandler] Cookie details:", JSON.stringify(cookies, null, 2));

    // WebView에 성공 알림 + 리다이렉트
    const response = { success: true };
    const script = `
      (function() {
        console.log('[CookieHandler.Script] Starting...');
        var callbackName = '__setCookieCallback_${messageId}';
        if (typeof window[callbackName] === 'function') {
          window[callbackName](${JSON.stringify(response)});
          delete window[callbackName];
          console.log('[CookieHandler.Script] Callback called');
        }
        
        // 쿠키 확인 (디버깅)
        console.log('[CookieHandler.Script] document.cookie:', document.cookie);
        
        // 약간의 딜레이 후 리다이렉트 (쿠키 동기화 대기)
        setTimeout(function() {
          console.log('[CookieHandler.Script] Redirecting to /dashboard');
          window.location.replace('/dashboard');
        }, 500);
        
        return true;
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
