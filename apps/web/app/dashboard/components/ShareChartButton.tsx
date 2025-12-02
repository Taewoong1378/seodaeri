'use client';

import { Button } from '@repo/design-system/components/button';
import html2canvas from 'html2canvas';
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
      // 차트를 이미지로 캡처
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: '#020617', // 배경색
        scale: 2, // 고해상도
        logging: false,
        useCORS: true,
      });

      // Canvas를 Blob으로 변환
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 1.0);
      });

      const file = new File([blob], `${title}.png`, { type: 'image/png' });

      // Web Share API 지원 확인
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `서대리 - ${title}`,
          files: [file],
        });
      } else {
        // Web Share API 미지원 시 다운로드
        const url = URL.createObjectURL(blob);
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
