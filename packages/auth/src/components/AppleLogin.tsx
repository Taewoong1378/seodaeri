"use client";

import { bridge } from "@repo/shared-utils/bridge";
import { useEffect, useState } from "react";

interface AppleLoginProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Apple 로그인 컴포넌트
 * - 환경변수 NEXT_PUBLIC_ENABLE_APPLE_LOGIN이 'true'일 때만 렌더링
 * - 네이티브 앱(iOS)에서만 표시됨
 */
export function AppleLogin({
  onSuccess,
  onError,
  className,
  children,
}: AppleLoginProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 환경변수로 Apple 로그인 활성화 여부 확인 (심사 후 비활성화용)
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_APPLE_LOGIN === "true";

  useEffect(() => {
    // 환경변수로 비활성화된 경우 체크하지 않음
    if (!isEnabled) {
      console.log("[AppleLogin] Disabled by env variable");
      return;
    }

    console.log("[AppleLogin] Checking availability...");
    console.log("[AppleLogin] isReactNative:", bridge.isReactNative());

    // 네이티브 앱에서만 Apple 로그인 가능 여부 확인
    bridge.checkAppleAvailable().then((available) => {
      console.log("[AppleLogin] checkAppleAvailable result:", available);
      setIsAvailable(available);
    });
  }, [isEnabled]);

  // 네이티브로 디버그 메시지 전송 (Safari 없이도 확인 가능)
  const debugLog = (step: string, data?: Record<string, unknown>) => {
    console.log(`[AppleLogin] ${step}`, data);
    try {
      window.ReactNativeWebView?.postMessage(
        JSON.stringify({ type: "Debug.AppleLogin.Component", step, ...data })
      );
    } catch {
      // ignore
    }
  };

  const handleAppleLogin = async () => {
    debugLog("button_clicked");
    setIsLoading(true);
    try {
      debugLog("calling_bridge");
      const response = await bridge.appleLogin();
      debugLog("bridge_response_received", {
        hasToken: !!response?.identityToken,
      });

      // 서버로 Apple 토큰 전송하여 세션 생성
      debugLog("calling_api");
      const res = await fetch("/api/auth/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(response),
      });

      debugLog("api_response", { status: res.status, ok: res.ok });

      if (res.ok) {
        debugLog("login_success_redirecting");
        onSuccess?.();
        // 페이지 새로고침으로 세션 반영 (여러 방법 시도)
        try {
          // 방법 1: location.replace (히스토리에 남지 않음)
          window.location.replace("/dashboard");
        } catch {
          // 방법 2: location.href
          window.location.href = "/dashboard";
        }
        // 방법 3: 강제 리로드 (fallback)
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const error = await res.json();
        debugLog("api_error", { error });
        throw new Error(error.message || "Apple login failed");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      debugLog("catch_error", { errorMessage });
      // 사용자 취소는 에러로 처리하지 않음
      if (errorMessage !== "CANCELED") {
        console.error("Apple login error:", errorMessage);
        onError?.(errorMessage);
      }
    } finally {
      debugLog("finally_block");
      setIsLoading(false);
    }
  };

  // 환경변수로 비활성화되었거나 네이티브 앱이 아니거나 Apple 로그인 불가능한 경우 렌더링하지 않음
  if (!isEnabled || !isAvailable) return null;

  return (
    <button
      type="button"
      onClick={handleAppleLogin}
      disabled={isLoading}
      className={className}
    >
      {children || (
        <span className="flex items-center gap-2">
          <AppleIcon />
          {isLoading ? "로그인 중..." : "Apple로 계속하기"}
        </span>
      )}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
