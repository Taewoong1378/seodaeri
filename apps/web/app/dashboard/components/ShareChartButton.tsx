"use client";

import { bridge } from "@repo/shared-utils/bridge";
import { toast } from "@repo/design-system";
import { Button } from "@repo/design-system/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { toPng } from "html-to-image";
import { Monitor, Share2, Smartphone } from "lucide-react";
import { useSession } from "next-auth/react";
import { type RefObject, useEffect, useState } from "react";

interface ShareChartButtonProps {
  chartRef: RefObject<HTMLDivElement | null>;
  title: string;
}

const CAPTURE_STYLE = {
  opacity: "1",
  visibility: "visible" as const,
  position: "static" as const,
  transform: "none",
  left: "auto",
  top: "auto",
};

/** 차트를 PNG로 캡처 */
async function captureChart(
  element: HTMLDivElement,
  forNative: boolean
): Promise<string> {
  return toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio: forNative ? 1.5 : 2,
    cacheBust: true,
    style: CAPTURE_STYLE,
  });
}

/** 가로 이미지를 세로로 회전 */
async function rotateImage(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => { img.onload = resolve; });

  const canvas = document.createElement("canvas");
  canvas.width = img.height;
  canvas.height = img.width;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((90 * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  }

  return canvas.toDataURL("image/png");
}

/** Web Share API 시도 (3초 타임아웃) */
async function tryWebShare(
  blob: Blob,
  fileName: string,
  shareTitle: string
): Promise<boolean> {
  if (typeof navigator.share !== "function") return false;

  try {
    const file = new File([blob], fileName, { type: blob.type });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 3000)
    );
    await Promise.race([
      navigator.share({ title: shareTitle, files: [file] }),
      timeout,
    ]);
    return true;
  } catch (error) {
    if ((error as Error).name === "AbortError") return true;
  }
  return false;
}

export function ShareChartButton({ chartRef, title }: ShareChartButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isNativeApp = bridge.isReactNative();
  const { data: session } = useSession();

  const isAdmin = (() => {
    const emails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    return emails.length > 0 && !!session?.user?.email && emails.includes(session.user.email);
  })();

  // 네이티브 → WebView 진단 콜백 등록 (관리자만)
  useEffect(() => {
    if (!isAdmin || !isNativeApp) return;
    const handler = (msg: string) => toast.info(`[Native] ${msg}`, { duration: 5000 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__shareImageDebug = handler;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__shareImageDebug = undefined;
    };
  }, [isAdmin, isNativeApp]);

  const handleShare = async (mode: "landscape" | "vertical") => {
    if (!chartRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      let dataUrl = await captureChart(chartRef.current, isNativeApp);

      if (!dataUrl || dataUrl.length < 100) {
        toast.error("캡처 실패: 이미지가 비어있습니다");
        return;
      }

      if (mode === "vertical") {
        dataUrl = await rotateImage(dataUrl);
      }

      if (isNativeApp) {
        // 네이티브: bridge로 공유
        bridge.shareImage({
          title: `Gulim_${title}`,
          imageBase64: dataUrl,
          mimeType: "image/png",
        });
      } else {
        // 웹: Web Share API → 다운로드 fallback
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileName = `Gulim_${title}_${mode}_${new Date().toISOString().split("T")[0]}.png`;

        const shared = await tryWebShare(blob, fileName, `Gulim - ${title}`);
        if (!shared) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Share failed:", error);
      toast.error(`공유 실패: ${(error as Error).message || "알 수 없는 오류"}`);
    } finally {
      setIsCapturing(false);
    }
  };

  /** 진단: 테스트 이미지로 bridge 공유 (관리자만) */
  const handleTestShare = () => {
    const testPng =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";
    toast.info(`테스트: bridge 호출 (${testPng.length}B)`);
    bridge.shareImage({
      title: "test_share",
      imageBase64: testPng,
      mimeType: "image/png",
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted transition-colors"
        onClick={() => setIsOpen(true)}
        disabled={isCapturing}
      >
        <Share2 size={16} className={isCapturing ? "animate-pulse" : ""} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-[425px] bg-background border-border text-foreground z-100 fixed rounded-[24px] p-6 shadow-xl"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "min(425px, calc(100vw - 2rem))",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-foreground">
              공유하기
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <button
              type="button"
              onClick={() => handleShare("vertical")}
              disabled={isCapturing}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-white border border-border hover:border-blue-500 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-4 rounded-full bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <Smartphone size={28} strokeWidth={2.5} />
              </div>
              <div className="relative text-center space-y-1">
                <span className="block font-bold text-foreground">
                  세로 모드
                </span>
                <span className="text-xs text-muted-foreground">
                  모바일 최적화
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleShare("landscape")}
              disabled={isCapturing}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-white border border-border hover:border-purple-500 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-4 rounded-full bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                <Monitor size={28} strokeWidth={2.5} />
              </div>
              <div className="relative text-center space-y-1">
                <span className="block font-bold text-foreground">
                  가로 모드
                </span>
                <span className="text-xs text-muted-foreground">
                  PC/태블릿 최적화
                </span>
              </div>
            </button>
          </div>
          {/* 진단용 테스트 버튼 - 관리자 + 네이티브만 표시 */}
          {isNativeApp && isAdmin && (
            <button
              type="button"
              onClick={handleTestShare}
              className="w-full py-2 text-xs text-muted-foreground underline"
            >
              [진단] 테스트 이미지 공유
            </button>
          )}
          {isCapturing && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-foreground">
                  이미지 생성 중...
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
