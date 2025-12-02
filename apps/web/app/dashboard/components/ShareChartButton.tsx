'use client';

import { Button } from '@repo/design-system/components/button';
import { toPng } from 'html-to-image';
import { Share2 } from 'lucide-react';
import { type RefObject, useState } from 'react';

interface ShareChartButtonProps {
  chartRef: RefObject<HTMLDivElement | null>;
  title: string;
}

export function ShareChartButton({ chartRef, title }: ShareChartButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShare = async () => {
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
      
      // 이미지를 로드하여 회전 처리
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
      const rotatedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => {
          resolve(b!);
        }, 'image/png');
      });

      const file = new File([rotatedBlob], `${title}.png`, { type: 'image/png' });

      // Web Share API 지원 확인
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `서대리 - ${title}`,
          files: [file],
        });
      } else {
        // Web Share API 미지원 시 다운로드
        const url = URL.createObjectURL(rotatedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `서대리_${title}_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
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
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
      onClick={handleShare}
      disabled={isCapturing}
    >
      <Share2 size={16} className={isCapturing ? 'animate-pulse' : ''} />
    </Button>
  );
}
