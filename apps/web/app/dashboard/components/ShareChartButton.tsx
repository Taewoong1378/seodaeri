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
 * 차트를 이미지로 캡처 (네이티브: JPEG 0.85 + pixelRatio 1.5, 웹: PNG + pixelRatio 2)
 * postMessage 크기 제한 대응을 위해 네이티브에서는 JPEG로 압축
 */
async function captureChart(
  element: HTMLDivElement,
  forNative: boolean
): Promise<{ dataUrl: string; mimeType: string }> {
  if (forNative) {
    // 네이티브: Canvas로 JPEG 변환하여 크기 축소
    const pngUrl = await toPng(element, {
      backgroundColor: "#ffffff",
      pixelRatio: 1.5,
      cacheBust: true,
      style: CAPTURE_STYLE,
    });
    const jpegUrl = await convertToJpeg(pngUrl, 0.85);
    return { dataUrl: jpegUrl, mimeType: "image/jpeg" };
  }
  // 웹: 고해상도 PNG
  const dataUrl = await toPng(element, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
    style: CAPTURE_STYLE,
  });
  return { dataUrl, mimeType: "image/png" };
}

/**
 * PNG data URL → JPEG data URL 변환 (canvas 활용)
 */
function convertToJpeg(dataUrl: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
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
   * 네이티브 앱에서의 공유 처리
   * JPEG 압축 + pixelRatio 축소로 postMessage 크기 최적화
   * 실패 시 pixelRatio를 더 낮춰 재시도
   */
  const handleNativeShare = async (mode: "landscape" | "vertical") => {
    if (!chartRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      let { dataUrl, mimeType } = await captureChart(chartRef.current, true);

      if (mode === "vertical") {
        dataUrl = await rotateImage(dataUrl, mimeType);
      }

      bridge.shareImage({
        title: `Gulim_${title}`,
        imageBase64: dataUrl,
        mimeType,
      });

      setIsOpen(false);
    } catch (firstError) {
      console.warn("Native share first attempt failed, retrying with lower quality:", firstError);
      // Fallback: pixelRatio 1 + JPEG 0.7
      try {
        let fallbackUrl = await toPng(chartRef.current, {
          backgroundColor: "#ffffff",
          pixelRatio: 1,
          cacheBust: true,
          style: CAPTURE_STYLE,
        });
        fallbackUrl = await convertToJpeg(fallbackUrl, 0.7);

        if (mode === "vertical") {
          fallbackUrl = await rotateImage(fallbackUrl, "image/jpeg");
        }

        bridge.shareImage({
          title: `Gulim_${title}`,
          imageBase64: fallbackUrl,
          mimeType: "image/jpeg",
        });

        setIsOpen(false);
      } catch (retryError) {
        console.error("Native share fallback also failed:", retryError);
        toast.error("공유에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  /**
   * 웹 브라우저에서의 공유 처리
   * Web Share API 또는 다운로드 fallback
   */
  const handleWebShare = async (mode: "landscape" | "vertical") => {
    if (!chartRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      const { dataUrl } = await captureChart(chartRef.current, false);

      let finalDataUrl = dataUrl;
      if (mode === "vertical") {
        finalDataUrl = await rotateImage(dataUrl, "image/png");
      }

      const res = await fetch(finalDataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${title}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Gulim - ${title}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Gulim_${title}_${mode}_${
          new Date().toISOString().split("T")[0]
        }.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Share failed:", error);
      if ((error as Error).name !== "AbortError") {
        toast.error("공유에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShare = isNativeApp ? handleNativeShare : handleWebShare;

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
