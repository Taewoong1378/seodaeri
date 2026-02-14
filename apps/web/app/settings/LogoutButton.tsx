"use client";

import { Button } from "@repo/design-system/components/button";
import { Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { sendMessageToNative } from "../../lib/native-bridge";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // 1. 네이티브 앱에 쿠키 삭제 요청
      sendMessageToNative({ type: "Auth.Logout" });

      // 2. 서버 로그아웃 (토큰 해지 + 쿠키 정리)
      await fetch("/api/auth/logout", { method: "POST" });

      // 3. 로그인 페이지로 이동
      window.location.href = "/login";
    } catch (error) {
      console.error("[Logout] Error:", error);
      // 에러 발생해도 로그인 페이지로 이동
      window.location.href = "/login";
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleLogout}
      disabled={loading}
      className="w-full h-14 rounded-[16px] bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive gap-2"
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <LogOut size={20} />
      )}
      {loading ? "로그아웃 중..." : "로그아웃"}
    </Button>
  );
}
