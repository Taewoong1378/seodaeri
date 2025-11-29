'use client';

import { Button } from '@repo/design-system/components/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@repo/design-system/components/dialog';
import { Input } from '@repo/design-system/components/input';
import { Label } from '@repo/design-system/components/label';
import { Camera, Check, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sendMessageToNative } from '../../../lib/native-bridge';
import { type OCRResult, analyzeTradeImage } from '../../actions/ocr';

export function OCRModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'initial' | 'preview' | 'verify'>('initial');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  useEffect(() => {
    // Listen for messages from Native
    const handleNativeMessage = (event: MessageEvent) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (message.type === 'IMAGE_CAPTURED') {
          setImageSrc(message.payload.base64);
          setStep('preview');
        }
      } catch (e) {
        console.error('Failed to parse native message', e);
      }
    };

    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage as any);

    return () => {
      window.removeEventListener('message', handleNativeMessage);
      document.removeEventListener('message', handleNativeMessage as any);
    };
  }, []);

  const handleCameraClick = () => {
    sendMessageToNative({ type: 'OPEN_CAMERA' });
  };

  const handleAnalyze = async () => {
    if (!imageSrc) return;
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeTradeImage(imageSrc);
      if (result) {
        setOcrResult(result);
        setStep('verify');
      } else {
        alert('이미지 분석에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full shadow-xl bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 text-white fixed bottom-20 right-4 z-50 animate-in zoom-in duration-300"
        >
          <Camera size={28} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] h-[90vh] sm:h-auto flex flex-col p-0 gap-0 overflow-hidden rounded-t-[20px] sm:rounded-lg bottom-0 sm:bottom-auto translate-y-0 sm:translate-y-[-50%] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:data-[state=open]:slide-in-from-bottom-0">
        <div className="p-6 pb-2">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>매매 인증</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X size={20} />
              </Button>
            </DialogClose>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {step === 'initial' && (
            <div className="flex flex-col items-center justify-center h-full space-y-6 py-10">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <Camera size={40} className="text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">거래 내역 촬영</h3>
                <p className="text-sm text-muted-foreground">
                  증권사 앱의 거래 내역을 캡처하거나<br />직접 촬영해주세요.
                </p>
              </div>
              <Button className="w-full max-w-xs" onClick={handleCameraClick}>
                촬영하기
              </Button>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                {imageSrc ? (
                  <img src={imageSrc} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <p className="text-muted-foreground">이미지 로딩 중...</p>
                )}
              </div>
              <Button className="w-full" onClick={handleAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  '분석하기'
                )}
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">거래일자</Label>
                <Input id="date" type="date" defaultValue={ocrResult?.date} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticker">종목코드</Label>
                <Input id="ticker" defaultValue={ocrResult?.ticker} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">단가</Label>
                  <Input id="price" type="number" defaultValue={ocrResult?.price} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">수량</Label>
                  <Input id="quantity" type="number" defaultValue={ocrResult?.quantity} />
                </div>
              </div>
              
              <div className="pt-4">
                <Button className="w-full bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90">
                  <Check className="mr-2 h-4 w-4" />
                  인증 완료
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
