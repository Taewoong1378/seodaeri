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
import { type RefObject, useState } from "react";

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

/**
 * 차트를 이미지로 캡처 (PNG)
 * 네이티브: pixelRatio 1.5 (postMessage 크기 최적화)
 * 웹: pixelRatio 2 (고해상도)
 */
async function captureChart(
  element: HTMLDivElement,
  forNative: boolean
): Promise<{ dataUrl: string; mimeType: string }> {
  const dataUrl = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio: forNative ? 1.5 : 2,
    cacheBust: true,
    style: CAPTURE_STYLE,
  });
  return { dataUrl, mimeType: "image/png" };
}

/**
 * 가로 이미지를 세로로 회전 (data URL → 회전된 data URL)
 */
async function rotateImage(
  dataUrl: string,
  outputMime: string
): Promise<string> {
  const img = new Image();
  img.src = dataUrl;

  await new Promise((resolve) => {
    img.onload = resolve;
  });

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

  return outputMime === "image/jpeg"
    ? canvas.toDataURL("image/jpeg", 0.85)
    : canvas.toDataURL("image/png");
}

export function ShareChartButton({ chartRef, title }: ShareChartButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const isNativeApp = bridge.isReactNative();

  /**
   * Web Share API로 공유 시도 (웹 + WebView 공통)
   * 모던 WebView(iOS 15+, Android Chrome)에서 navigator.share 지원
   */
  const shareViaWebAPI = async (
    blob: Blob,
    fileName: string
  ): Promise<boolean> => {
    if (typeof navigator.share !== "function") return false;

    try {
      const file = new File([blob], fileName, { type: blob.type });
      // 3초 타임아웃 (Android WebView에서 hang 방지)
      const sharePromise = navigator.share({
        title: `Gulim - ${title}`,
        files: [file],
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      );
      await Promise.race([sharePromise, timeoutPromise]);
      return true;
    } catch (error) {
      if ((error as Error).name === "AbortError") return true;
      console.warn("Web Share API failed:", error);
    }
    return false;
  };

  /**
   * 통합 공유 핸들러
   * 1. 이미지 캡처 (PNG)
   * 2. Web Share API 시도 (웹/네이티브 공통, 3초 타임아웃)
   * 3. 실패 시: 네이티브 → bridge, 웹 → 다운로드
   */
  const handleShare = async (mode: "landscape" | "vertical") => {
    if (!chartRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      let { dataUrl, mimeType } = await captureChart(
        chartRef.current,
        isNativeApp
      );

      if (!dataUrl || dataUrl.length < 100) {
        toast.error("캡처 실패: 이미지가 비어있습니다");
        return;
      }

      if (mode === "vertical") {
        dataUrl = await rotateImage(dataUrl, mimeType);
      }

      // data URL → Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `Gulim_${title}_${mode}_${
        new Date().toISOString().split("T")[0]
      }.png`;

      // 1차: Web Share API (웹/WebView 공통, 타임아웃 적용)
      const shared = await shareViaWebAPI(blob, fileName);
      if (shared) {
        setIsOpen(false);
        return;
      }

      // 2차 fallback
      if (isNativeApp) {
        // 네이티브: bridge
        bridge.shareImage({
          title: `Gulim_${title}`,
          imageBase64: dataUrl,
          mimeType,
        });
      } else {
        // 웹: 다운로드
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Share failed:", error);
      toast.error(`공유 실패: ${(error as Error).message || "알 수 없는 오류"}`);
    } finally {
      setIsCapturing(false);
    }
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
          className="sm:max-w-[425px] bg-background border-border text-foreground z-[100] fixed rounded-[24px] p-6 shadow-xl"
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
