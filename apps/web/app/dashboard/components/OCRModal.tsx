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
import { type OCRResult, analyzeTradeImage, saveTransaction } from '../../actions/ocr';

export function OCRModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'initial' | 'preview' | 'verify'>('initial');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [editedResult, setEditedResult] = useState<OCRResult | null>(null);

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
        setEditedResult(result);
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

  const handleSave = async () => {
    if (!editedResult) return;

    setIsSaving(true);
    try {
      const result = await saveTransaction(editedResult);
      if (result.success) {
        alert('거래내역이 저장되었습니다.');
        handleReset();
        setIsOpen(false);
      } else {
        alert(result.error || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('initial');
    setImageSrc(null);
    setOcrResult(null);
    setEditedResult(null);
  };

  const updateField = (field: keyof OCRResult, value: string | number) => {
    if (!editedResult) return;
    setEditedResult({ ...editedResult, [field]: value });
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

          {step === 'verify' && editedResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">거래일자</Label>
                <Input
                  id="date"
                  type="date"
                  value={editedResult.date}
                  onChange={(e) => updateField('date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticker">종목코드</Label>
                <Input
                  id="ticker"
                  value={editedResult.ticker}
                  onChange={(e) => updateField('ticker', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">종목명</Label>
                <Input
                  id="name"
                  value={editedResult.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="종목명 입력 (선택)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">단가</Label>
                  <Input
                    id="price"
                    type="number"
                    value={editedResult.price}
                    onChange={(e) => updateField('price', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">수량</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={editedResult.quantity}
                    onChange={(e) => updateField('quantity', Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>거래유형</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={editedResult.type === 'BUY' ? 'default' : 'outline'}
                    className={editedResult.type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    onClick={() => updateField('type', 'BUY')}
                  >
                    매수
                  </Button>
                  <Button
                    type="button"
                    variant={editedResult.type === 'SELL' ? 'default' : 'outline'}
                    className={editedResult.type === 'SELL' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => updateField('type', 'SELL')}
                  >
                    매도
                  </Button>
                </div>
              </div>

              <div className="pt-4 space-y-2">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      인증 완료
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  다시 촬영
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
