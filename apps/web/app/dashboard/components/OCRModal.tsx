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

interface OCRModalProps {
  mode?: 'trade' | 'dividend';
}

export function OCRModal({ mode = 'trade' }: OCRModalProps) {
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
    console.log('[OCRModal] Button clicked, mode:', mode);
    // 모달만 열기 (파일 선택은 모달 내 버튼으로)
    setIsOpen(true);
  };

  const handleSelectImage = () => {
    console.log('[OCRModal] Select image clicked');
    // 네이티브 앱 환경인지 확인
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      console.log('[OCRModal] Native app detected, opening gallery');
      sendMessageToNative({ type: 'OPEN_GALLERY' });
    } else {
      console.log('[OCRModal] Web environment, triggering file input');
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[OCRModal] handleFileSelect called');
    const file = event.target.files?.[0];
    if (!file) {
      console.log('[OCRModal] No file selected');
      return;
    }

    console.log('[OCRModal] File selected:', file.name, file.type, file.size);

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택해주세요.');
      return;
    }

    // 파일을 base64로 변환
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      console.log('[OCRModal] File read complete, base64 length:', base64?.length);
      setImageSrc(base64);
      setStep('preview');
    };
    reader.onerror = (error) => {
      console.error('[OCRModal] FileReader error:', error);
      alert('이미지를 불러오는데 실패했습니다.');
    };
    reader.readAsDataURL(file);

    // input 초기화 (같은 파일 재선택 가능하도록)
    event.target.value = '';
  };

  const handleAnalyze = async () => {
    console.log('[OCRModal] handleAnalyze called, imageSrc exists:', !!imageSrc, 'mode:', mode);
    if (!imageSrc) {
      console.log('[OCRModal] No imageSrc, returning');
      return;
    }

    setIsAnalyzing(true);
    console.log('[OCRModal] Starting analysis...');
    try {
      const result = await analyzeTradeImage(imageSrc, mode);
      console.log('[OCRModal] Analysis result:', result);
      if (result) {
        // mode가 dividend면 type을 DIVIDEND로, quantity를 1로 설정
        const adjustedResult = mode === 'dividend'
          ? { ...result, type: 'DIVIDEND' as const, quantity: 1 }
          : result;
        console.log('[OCRModal] Adjusted result:', adjustedResult);
        setOcrResult(adjustedResult);
        setEditedResult(adjustedResult);
        setStep('verify');
      } else {
        console.log('[OCRModal] No result from analysis');
        alert('이미지 분석에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('[OCRModal] Analysis error:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
      console.log('[OCRModal] Analysis complete');
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
      {/* Hidden file input for web - outside Dialog so it always exists */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button
        size="icon"
        onClick={handleButtonClick}
        className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 active:scale-90 active:bg-blue-800 text-white fixed bottom-24 right-[max(1.25rem,calc(50%-250px+1.25rem))] z-50 animate-in zoom-in duration-300 transition-transform"
      >
        <ImagePlus size={28} />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-[#0f172a] border-white/10 text-white">
          <div className="p-5 pb-3 border-b border-white/10">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-white text-lg font-bold">{mode === 'dividend' ? '배당 인증' : '매매 인증'}</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10">
                  <X size={20} />
                </Button>
              </DialogClose>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {step === 'initial' && (
              <div className="flex flex-col items-center justify-center space-y-6 py-10">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                  <ImagePlus size={36} className="text-slate-400" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg text-white">
                    {mode === 'dividend' ? '배당 내역 첨부' : '거래 내역 첨부'}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {mode === 'dividend'
                      ? '증권사 앱의 배당 입금 화면을\n캡처한 이미지를 첨부해주세요.'
                      : '증권사 앱의 거래 체결 화면을\n캡처한 이미지를 첨부해주세요.'}
                  </p>
                </div>
                <Button
                  className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleSelectImage}
                >
                  이미지 선택
                </Button>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-4">
                <div className="aspect-[3/4] bg-white/5 rounded-xl flex items-center justify-center relative overflow-hidden border border-white/10">
                  {imageSrc ? (
                    <img src={imageSrc} alt="Selected" className="w-full h-full object-contain" />
                  ) : (
                    <p className="text-slate-500">이미지 로딩 중...</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
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
                    className="w-full border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
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
                  <Label htmlFor="date" className="text-slate-300">거래일자</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editedResult.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticker" className="text-slate-300">종목코드</Label>
                  <Input
                    id="ticker"
                    value={editedResult.ticker}
                    onChange={(e) => updateField('ticker', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">종목명</Label>
                  <Input
                    id="name"
                    value={editedResult.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="종목명 입력 (선택)"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
                {mode === 'dividend' ? (
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-slate-300">배당금액 (원)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={editedResult.price}
                      onChange={(e) => updateField('price', Number(e.target.value))}
                      placeholder="세후 배당금액"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="text-slate-300">단가</Label>
                      <Input
                        id="price"
                        type="number"
                        value={editedResult.price}
                        onChange={(e) => updateField('price', Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-slate-300">수량</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={editedResult.quantity}
                        onChange={(e) => updateField('quantity', Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-slate-300">거래유형</Label>
                  {mode === 'dividend' ? (
                    <div className="p-3 rounded-lg bg-blue-600/20 border border-blue-500/30 text-center">
                      <span className="text-blue-400 font-medium">배당</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={editedResult.type === 'BUY' ? 'default' : 'outline'}
                        className={editedResult.type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-white/20 text-slate-300 hover:bg-white/10 hover:text-white'}
                        onClick={() => updateField('type', 'BUY')}
                      >
                        매수
                      </Button>
                      <Button
                        type="button"
                        variant={editedResult.type === 'SELL' ? 'default' : 'outline'}
                        className={editedResult.type === 'SELL' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-white/20 text-slate-300 hover:bg-white/10 hover:text-white'}
                        onClick={() => updateField('type', 'SELL')}
                      >
                        매도
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                    className="w-full border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
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
