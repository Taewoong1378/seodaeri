'use client';

import { Button } from '@repo/design-system/components/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@repo/design-system/components/dialog';
import { toPng } from 'html-to-image';
import { Monitor, Share2, Smartphone } from 'lucide-react';
import { type RefObject, useState } from 'react';

interface ShareChartButtonProps {
  chartRef: RefObject<HTMLDivElement | null>;
  title: string;
}

export function ShareChartButton({ chartRef, title }: ShareChartButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = async (mode: 'landscape' | 'vertical') => {
    if (!chartRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      // 차트를 이미지로 캡처 (html-to-image 사용)
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: '#020617', // 배경색
        pixelRatio: 2, // 고해상도
        cacheBust: true,
        style: {
          opacity: '1',
          visibility: 'visible',
          position: 'static',
          transform: 'none',
          left: 'auto',
          top: 'auto',
        },
      });

      // DataURL을 Blob으로 변환
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      
      let finalBlob = blob;

      // Vertical 모드일 경우 회전 처리
      if (mode === 'vertical') {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        // 캔버스를 사용하여 90도 회전
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(90 * Math.PI / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }
        
        // 회전된 이미지를 Blob으로 변환
        finalBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => {
            resolve(b!);
          }, 'image/png');
        });
      }

      const file = new File([finalBlob], `${title}.png`, { type: 'image/png' });

      // Web Share API 지원 확인
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Gulim - ${title}`,
          files: [file],
        });
      } else {
        // Web Share API 미지원 시 다운로드
        const url = URL.createObjectURL(finalBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Gulim_${title}_${mode}_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Share failed:', error);
      // 사용자가 공유를 취소한 경우는 무시
      if ((error as Error).name !== 'AbortError') {
        alert('공유에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
        onClick={() => setIsOpen(true)}
        disabled={isCapturing}
      >
        <Share2 size={16} className={isCapturing ? 'animate-pulse' : ''} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-[425px] bg-slate-900 border-white/10 text-white z-[100] fixed rounded-[20px]"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(425px, calc(100vw - 2rem))',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">공유하기</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <button
              type="button"
              onClick={() => handleShare('vertical')}
              disabled={isCapturing}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 hover:border-blue-500/50 group"
            >
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Smartphone size={32} />
              </div>
              <div className="text-center">
                <span className="block font-semibold mb-1">세로 모드</span>
                <span className="text-xs text-slate-400">모바일 최적화 (회전)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleShare('landscape')}
              disabled={isCapturing}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all border border-slate-700 hover:border-blue-500/50 group"
            >
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <Monitor size={32} />
              </div>
              <div className="text-center">
                <span className="block font-semibold mb-1">가로 모드</span>
                <span className="text-xs text-slate-400">PC/태블릿 최적화</span>
              </div>
            </button>
          </div>
          {isCapturing && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-white">이미지 생성 중...</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
