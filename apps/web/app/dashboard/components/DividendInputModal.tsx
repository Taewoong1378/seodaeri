'use client';

import { Button } from '@repo/design-system/components/button';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@repo/design-system/components/dialog';
import { Input } from '@repo/design-system/components/input';
import { Label } from '@repo/design-system/components/label';
import { Camera, Check, Loader2, Pen, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { saveDividend, type DividendInput } from '../../actions/dividend';
import { analyzeTradeImage } from '../../actions/ocr';

type InputMode = 'select' | 'manual' | 'photo-preview' | 'photo-verify';

export function DividendInputModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>('select');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form state
  const [formData, setFormData] = useState<DividendInput>({
    date: new Date().toISOString().split('T')[0] || '',
    ticker: '',
    name: '',
    amountKRW: 0,
    amountUSD: 0,
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const resetState = () => {
    setMode('select');
    setImageSrc(null);
    setFormData({
      date: new Date().toISOString().split('T')[0] || '',
      ticker: '',
      name: '',
      amountKRW: 0,
      amountUSD: 0,
    });
  };

  const handleManualMode = () => {
    setMode('manual');
  };

  const handlePhotoMode = () => {
    // 바로 파일 선택 열기
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 선택해주세요.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageSrc(base64);
      setMode('photo-preview');
    };
    reader.onerror = () => {
      alert('이미지를 불러오는데 실패했습니다.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleAnalyze = async () => {
    if (!imageSrc) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzeTradeImage(imageSrc, 'dividend');
      if (result) {
        setFormData({
          date: result.date,
          ticker: result.ticker,
          name: result.name || '',
          amountKRW: result.price, // OCR에서는 price로 반환
          amountUSD: 0,
        });
        setMode('photo-verify');
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
    if (!formData.ticker) {
      alert('종목코드를 입력해주세요.');
      return;
    }
    if (formData.amountKRW === 0 && formData.amountUSD === 0) {
      alert('배당금을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveDividend(formData);
      if (result.success) {
        alert('배당내역이 저장되었습니다.');
        handleOpenChange(false);
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

  const updateField = (field: keyof DividendInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Floating Action Button - Portal로 body에 렌더링 + BottomNav 패턴 */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-24 left-0 right-0 z-50 max-w-[500px] mx-auto pointer-events-none">
            <Button
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 active:scale-90 active:bg-blue-800 text-white absolute right-5 bottom-0 pointer-events-auto animate-in zoom-in duration-300 transition-transform"
            >
              <Pen size={24} />
            </Button>
          </div>,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-[#0f172a] border-white/10 text-white"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(425px, calc(100vw - 2rem))',
          }}
        >
          <div className="p-5 pb-3 border-b border-white/10">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-white text-lg font-bold">
                배당 내역 추가
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X size={20} />
                </Button>
              </DialogClose>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Mode Selection */}
            {mode === 'select' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 text-center mb-6">
                  입력 방식을 선택하세요
                </p>
                <Button
                  className="w-full h-20 bg-white/5 hover:bg-white/10 border border-white/10 text-white flex flex-col gap-2"
                  variant="ghost"
                  onClick={handleManualMode}
                >
                  <Pen size={24} className="text-blue-400" />
                  <span>직접 입력</span>
                </Button>
                <Button
                  className="w-full h-20 bg-white/5 hover:bg-white/10 border border-white/10 text-white flex flex-col gap-2"
                  variant="ghost"
                  onClick={handlePhotoMode}
                >
                  <Camera size={24} className="text-emerald-400" />
                  <span>사진으로 입력</span>
                </Button>
              </div>
            )}

            {/* Manual Input Form */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-slate-300">
                    배당 입금일
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticker" className="text-slate-300">
                    종목코드
                  </Label>
                  <Input
                    id="ticker"
                    value={formData.ticker}
                    onChange={(e) => updateField('ticker', e.target.value)}
                    placeholder="예: 446720, AAPL"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    종목명 (선택)
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="예: SOL 미국배당 다우존스"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amountKRW" className="text-slate-300">
                      원화 배당금
                    </Label>
                    <Input
                      id="amountKRW"
                      type="number"
                      value={formData.amountKRW || ''}
                      onChange={(e) =>
                        updateField('amountKRW', Number(e.target.value))
                      }
                      placeholder="0"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountUSD" className="text-slate-300">
                      외화 배당금 ($)
                    </Label>
                    <Input
                      id="amountUSD"
                      type="number"
                      step="0.01"
                      value={formData.amountUSD || ''}
                      onChange={(e) =>
                        updateField('amountUSD', Number(e.target.value))
                      }
                      placeholder="0.00"
                      className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
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
                        저장하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => setMode('select')}
                    disabled={isSaving}
                  >
                    뒤로
                  </Button>
                </div>
              </div>
            )}

            {/* Photo Preview */}
            {mode === 'photo-preview' && (
              <div className="space-y-4">
                <div className="aspect-[3/4] bg-white/5 rounded-xl flex items-center justify-center relative overflow-hidden border border-white/10">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Selected"
                      className="w-full h-full object-contain"
                    />
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
                    onClick={() => {
                      setImageSrc(null);
                      setMode('select');
                    }}
                    disabled={isAnalyzing}
                  >
                    다시 선택
                  </Button>
                </div>
              </div>
            )}

            {/* Photo Verify (after OCR) */}
            {mode === 'photo-verify' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 text-center">
                  분석 결과를 확인하고 수정해주세요
                </p>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-slate-300">
                    배당 입금일
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => updateField('date', e.target.value)}
                    className="bg-white/5 border-white/10 text-white [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ticker" className="text-slate-300">
                    종목코드
                  </Label>
                  <Input
                    id="ticker"
                    value={formData.ticker}
                    onChange={(e) => updateField('ticker', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    종목명
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amountKRW" className="text-slate-300">
                      원화 배당금
                    </Label>
                    <Input
                      id="amountKRW"
                      type="number"
                      value={formData.amountKRW || ''}
                      onChange={(e) =>
                        updateField('amountKRW', Number(e.target.value))
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amountUSD" className="text-slate-300">
                      외화 배당금 ($)
                    </Label>
                    <Input
                      id="amountUSD"
                      type="number"
                      step="0.01"
                      value={formData.amountUSD || ''}
                      onChange={(e) =>
                        updateField('amountUSD', Number(e.target.value))
                      }
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
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
                        저장하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setImageSrc(null);
                      setMode('select');
                    }}
                    disabled={isSaving}
                  >
                    다시 입력
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
