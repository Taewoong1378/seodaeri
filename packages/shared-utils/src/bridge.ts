/**
 * React Native Bridge Utility for Gulim App
 * 웹-앱 통신을 위한 브릿지 시스템
 */

export type BridgeMessageType =
  | "Navigation.GoBack"
  | "UI.Share"
  | "UI.ShareImage"
  | "Auth.Apple.Request"
  | "Auth.Apple.CheckAvailable"
  | "Auth.SetCookie"
  | "Auth.Logout";

export interface BridgePayloads {
  "Navigation.GoBack": undefined;
  "UI.Share": { title: string; url: string; message?: string };
  "UI.ShareImage": {
    title: string;
    imageBase64: string;
    mimeType?: string;
  };
  "Auth.Apple.Request": undefined;
  "Auth.Apple.CheckAvailable": undefined;
  "Auth.SetCookie": { token: string; cookieName: string; domain: string };
  "Auth.Logout": undefined;
}

export interface AppleLoginResponse {
  identityToken: string;
  authorizationCode: string;
  user: string;
  email?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
  realUserStatus?: number;
}

export interface BridgeMessage<T extends BridgeMessageType> {
  type: T;
  payload?: BridgePayloads[T];
  id?: string;
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    safeAreaInsets?: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
  }
}

export class RNBridge {
  /**
   * 현재 환경이 React Native WebView인지 확인
   */
  isReactNative(): boolean {
    return typeof window !== "undefined" && !!window.ReactNativeWebView;
  }

  /**
   * 네이티브 앱으로 메시지 전송
   */
  postMessage<T extends BridgeMessageType>(
    type: T,
    payload?: BridgePayloads[T]
  ): string {
    const messageId = Math.random().toString(36).substring(7);
    if (this.isReactNative()) {
      const message: BridgeMessage<T> = { type, payload, id: messageId };
      window.ReactNativeWebView?.postMessage(JSON.stringify(message));
    }
    return messageId;
  }

  /**
   * 뒤로 가기 요청
   */
  goBack(): void {
    this.postMessage("Navigation.GoBack");
  }

  /**
   * 공유 기능 호출
   */
  share(data: BridgePayloads["UI.Share"]): void {
    this.postMessage("UI.Share", data);
  }

  /**
   * 이미지 공유 기능 호출
   * base64 인코딩된 이미지를 네이티브 공유 시트로 전달
   */
  shareImage(data: BridgePayloads["UI.ShareImage"]): void {
    this.postMessage("UI.ShareImage", data);
  }

  /**
   * 네이티브 Apple 로그인 요청
   * iOS 앱에서만 동작
   */
  appleLogin(): Promise<AppleLoginResponse> {
    return new Promise((resolve, reject) => {
      if (!this.isReactNative()) {
        reject(
          new Error("Apple native login is only available in React Native")
        );
        return;
      }

      const messageId = this.postMessage("Auth.Apple.Request");
      console.log("[Bridge] appleLogin - sent messageId:", messageId);

      // 전역 콜백 함수 등록 (이벤트 리스너보다 안정적)
      const callbackName = `__appleLoginCallback_${messageId}`;
      console.log("[Bridge] appleLogin - registering callback:", callbackName);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as unknown as Record<string, unknown>)[callbackName] = (data: {
        id: string;
        data?: AppleLoginResponse;
        error?: string;
      }) => {
        // 네이티브로 디버그 메시지 전송 (Safari 없이도 확인 가능)
        try {
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: "Debug.Bridge",
              step: "callback_received",
              hasData: !!data?.data,
              hasError: !!data?.error,
              dataKeys: data ? Object.keys(data) : [],
            })
          );
        } catch (e) {
          // ignore
        }

        console.log(
          "[Bridge] appleLogin - callback called with:",
          JSON.stringify(data)
        );

        // 콜백 정리
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as unknown as Record<string, unknown>)[callbackName];

        if (data.error) {
          console.log("[Bridge] appleLogin - has error:", data.error);
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({ type: "Debug.Bridge", step: "rejecting_error" })
          );
          reject(new Error(data.error));
        } else if (data.data) {
          console.log("[Bridge] appleLogin - has data, resolving");
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({ type: "Debug.Bridge", step: "resolving_data" })
          );
          resolve(data.data);
        } else {
          window.ReactNativeWebView?.postMessage(
            JSON.stringify({
              type: "Debug.Bridge",
              step: "no_data_no_error",
              receivedData: JSON.stringify(data),
            })
          );
        }
      };

      // 이벤트 리스너도 백업으로 유지
      const handler = (event: Event) => {
        console.log("[Bridge] appleLogin - received event:", event.type);
        const customEvent = event as CustomEvent;
        console.log(
          "[Bridge] appleLogin - event detail:",
          JSON.stringify(customEvent.detail)
        );

        if (customEvent.detail?.id === messageId) {
          console.log("[Bridge] appleLogin - ID matched!");
          window.removeEventListener("Bridge.AppleLogin", handler);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (window as unknown as Record<string, unknown>)[callbackName];

          if (customEvent.detail.error) {
            reject(new Error(customEvent.detail.error));
          } else if (customEvent.detail.data) {
            resolve(customEvent.detail.data as AppleLoginResponse);
          }
        }
      };

      window.addEventListener("Bridge.AppleLogin", handler);
      console.log("[Bridge] appleLogin - event listener registered");

      // 60초 타임아웃
      setTimeout(() => {
        window.removeEventListener("Bridge.AppleLogin", handler);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as unknown as Record<string, unknown>)[callbackName];
        reject(new Error("Apple login timeout"));
      }, 60000);
    });
  }

  /**
   * Apple 로그인 가능 여부 확인
   * iOS 13+ 디바이스에서만 true 반환
   */
  checkAppleAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.isReactNative()) {
        resolve(false);
        return;
      }

      const messageId = this.postMessage("Auth.Apple.CheckAvailable");

      const handler = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.id === messageId) {
          window.removeEventListener("Bridge.AppleAvailable", handler);
          resolve(customEvent.detail.available ?? false);
        }
      };

      window.addEventListener("Bridge.AppleAvailable", handler);

      // 5초 타임아웃
      setTimeout(() => {
        window.removeEventListener("Bridge.AppleAvailable", handler);
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Safe Area Insets 가져오기 (iOS notch, Android status bar 등)
   */
  getSafeAreaInsets(): {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } {
    return (
      window.safeAreaInsets ?? {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      }
    );
  }

  /**
   * 네이티브에서 쿠키 설정 (iOS WebView 쿠키 문제 해결용)
   */
  setCookie(data: {
    token: string;
    cookieName: string;
    domain: string;
  }): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.isReactNative()) {
        reject(new Error("setCookie is only available in React Native"));
        return;
      }

      const messageId = this.postMessage("Auth.SetCookie", data);
      console.log("[Bridge] setCookie - sent messageId:", messageId);

      const callbackName = `__setCookieCallback_${messageId}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as unknown as Record<string, unknown>)[callbackName] =
        (response: { success: boolean; error?: string }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delete (window as unknown as Record<string, unknown>)[callbackName];
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        };

      // 10초 타임아웃
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (window as unknown as Record<string, unknown>)[callbackName];
        reject(new Error("setCookie timeout"));
      }, 10000);
    });
  }
}

export const bridge = new RNBridge();
