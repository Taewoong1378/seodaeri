'use client';

import { Button } from '@repo/design-system/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@repo/design-system/components/dialog';
import { Input } from '@repo/design-system/components/input';
import { Label } from '@repo/design-system/components/label';
import { Check, ImagePlus, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Listen for messages from Native (갤러리에서 이미지 선택 시)
    const handleNativeMessage = (event: MessageEvent) => {
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (message.type === 'IMAGE_SELECTED' || message.type === 'IMAGE_CAPTURED') {
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

  const handleButtonClick = () => {
    // 네이티브 앱 환경인지 확인
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      // 네이티브 앱에 갤러리 열기 요청
      sendMessageToNative({ type: 'OPEN_GALLERY' });
    } else {
      // 웹 환경에서는 file input 사용
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택해주세요.');
      return;
    }

    // 파일을 base64로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageSrc(base64);
      setStep('preview');
      setIsOpen(true);
    };
    reader.onerror = () => {
      alert('이미지를 불러오는데 실패했습니다.');
    };
    reader.readAsDataURL(file);

    // input 초기화 (같은 파일 재선택 가능하도록)
    event.target.value = '';
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

  // 모달 열림 상태 변경 핸들러
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      handleReset();
    }
  };

  return (
    <>
      <Button
        size="icon"
        onClick={handleButtonClick}
        className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 text-white fixed bottom-24 right-5 z-50 animate-in zoom-in duration-300"
      >
        <ImagePlus size={28} />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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

          {/* Hidden file input for web */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            {step === 'initial' && (
              <div className="flex flex-col items-center justify-center h-full space-y-6 py-10">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                  <ImagePlus size={40} className="text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">거래 내역 첨부</h3>
                  <p className="text-sm text-muted-foreground">
                    증권사 앱의 거래 체결 화면을<br />캡처한 이미지를 첨부해주세요.
                  </p>
                </div>
                <Button className="w-full max-w-xs" onClick={handleButtonClick}>
                  이미지 선택
                </Button>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-6">
                <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center relative overflow-hidden">
                  {imageSrc ? (
                    <img src={imageSrc} alt="Selected" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-muted-foreground">이미지 로딩 중...</p>
                  )}
                </div>
                <div className="space-y-2">
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
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReset}
                    disabled={isAnalyzing}
                  >
                    다른 이미지 선택
                  </Button>
                </div>
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
                    다시 선택
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
