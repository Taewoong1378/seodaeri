'use client';

import { Button } from '@repo/design-system/components/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@repo/design-system/components/dialog';
import { Input } from '@repo/design-system/components/input';
import { Label } from '@repo/design-system/components/label';
import { Camera, Check, Loader2, Pen, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSaveTradeTransactions } from '../../../hooks';
import { analyzeTradeImages } from '../../actions/trade';
import { StockSearchInput } from '../../components/StockSearchInput';

type InputMode = 'select' | 'manual' | 'photo-preview' | 'photo-verify';
type TradeType = 'BUY' | 'SELL';

interface TradeFormItem {
  date: string;
  ticker: string;
  name: string;
  price: number;
  quantity: number;
  type: TradeType;
}

export function TradeInputModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>('select');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 종목 검색 리셋용 키
  const [searchResetKey, setSearchResetKey] = useState(0);

  // TanStack Query mutation
  const { mutate: saveTradeTransactions, isPending: isSaving } = useSaveTradeTransactions();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 단일 입력용 (직접 입력)
  const [singleForm, setSingleForm] = useState<TradeFormItem>({
    date: new Date().toISOString().split('T')[0] || '',
    ticker: '',
    name: '',
    price: 0,
    quantity: 0,
    type: 'BUY',
  });

  // 다중 입력용 (사진 분석)
  const [multipleItems, setMultipleItems] = useState<TradeFormItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const resetState = () => {
    setMode('select');
    setImageSrc(null);
    setSingleForm({
      date: new Date().toISOString().split('T')[0] || '',
      ticker: '',
      name: '',
      price: 0,
      quantity: 0,
      type: 'BUY',
    });
    setMultipleItems([]);
    setSelectedItems(new Set());
    setSearchResetKey((prev) => prev + 1);
  };

  const handleManualMode = () => {
    setMode('manual');
  };

  const handlePhotoMode = () => {
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
      const results = await analyzeTradeImages(imageSrc);
      if (results.length > 0) {
        setMultipleItems(results.map(item => ({
          date: item.date,
          ticker: item.ticker,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          type: item.type,
        })));
        setSelectedItems(new Set(results.map((_, idx) => idx)));
        setMode('photo-verify');
      } else {
        alert('거래내역을 찾을 수 없습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSingle = () => {
    if (!singleForm.ticker) {
      alert('종목을 선택하거나 종목코드를 입력해주세요.');
      return;
    }
    if (singleForm.price === 0 || singleForm.quantity === 0) {
      alert('가격과 수량을 입력해주세요.');
      return;
    }

    saveTradeTransactions([singleForm], {
      onSuccess: (result) => {
        if (result.success) {
          alert('거래내역이 저장되었습니다.');
          handleOpenChange(false);
        } else {
          alert(result.error || '저장에 실패했습니다.');
        }
      },
      onError: (error) => {
        console.error('Save error:', error);
        alert('저장 중 오류가 발생했습니다.');
      },
    });
  };

  const handleSaveMultiple = () => {
    const itemsToSave = multipleItems.filter((_, idx) => selectedItems.has(idx));

    if (itemsToSave.length === 0) {
      alert('저장할 항목을 선택해주세요.');
      return;
    }

    saveTradeTransactions(itemsToSave, {
      onSuccess: (result) => {
        if (result.success) {
          alert(`${itemsToSave.length}건의 거래내역이 저장되었습니다.`);
          handleOpenChange(false);
        } else {
          alert(result.error || '저장에 실패했습니다.');
        }
      },
      onError: (error) => {
        console.error('Save error:', error);
        alert('저장 중 오류가 발생했습니다.');
      },
    });
  };

  const toggleItemSelection = (idx: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === multipleItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(multipleItems.map((_, idx) => idx)));
    }
  };

  const updateMultipleItem = (idx: number, field: keyof TradeFormItem, value: string | number) => {
    setMultipleItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (idx: number) => {
    setMultipleItems((prev) => prev.filter((_, i) => i !== idx));
    const newSelected = new Set(selectedItems);
    newSelected.delete(idx);
    const adjusted = new Set<number>();
    newSelected.forEach((i) => {
      if (i > idx) {
        adjusted.add(i - 1);
      } else {
        adjusted.add(i);
      }
    });
    setSelectedItems(adjusted);
  };

  const updateSingleField = (field: keyof TradeFormItem, value: string | number) => {
    setSingleForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
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

      {/* Floating Action Button - Emerald for trades */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-24 left-0 right-0 z-50 max-w-[500px] mx-auto pointer-events-none">
            <Button
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 active:bg-emerald-800 text-white absolute right-5 bottom-0 pointer-events-auto animate-in zoom-in duration-300 transition-transform"
            >
              <Pen size={24} />
            </Button>
          </div>,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[20px] bg-popover border-border text-popover-foreground"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: 'min(425px, calc(100vw - 2rem))',
          }}
        >
          <div className="p-5 pb-3 border-b border-border">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-foreground text-lg font-bold">
                거래 내역 추가
              </DialogTitle>
              <DialogClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
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
                <p className="text-sm text-muted-foreground text-center mb-6">
                  입력 방식을 선택하세요
                </p>
                <Button
                  className="w-full h-20 bg-muted/50 hover:bg-muted border border-border text-foreground flex flex-col gap-2"
                  variant="ghost"
                  onClick={handleManualMode}
                >
                  <Pen size={24} className="text-emerald-500" />
                  <span>직접 입력</span>
                </Button>
                <Button
                  className="w-full h-20 bg-muted/50 hover:bg-muted border border-border text-foreground flex flex-col gap-2"
                  variant="ghost"
                  onClick={handlePhotoMode}
                >
                  <Camera size={24} className="text-blue-500" />
                  <span>사진으로 입력 (여러 건)</span>
                </Button>
              </div>
            )}

            {/* Manual Input Form */}
            {mode === 'manual' && (
              <div className="space-y-4">
                {/* 매수/매도 선택 */}
                <div className="flex gap-2">
                  <Button
                    variant={singleForm.type === 'BUY' ? 'default' : 'outline'}
                    className={`flex-1 ${singleForm.type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-border text-muted-foreground'}`}
                    onClick={() => updateSingleField('type', 'BUY')}
                  >
                    <TrendingUp size={16} className="mr-2" />
                    매수
                  </Button>
                  <Button
                    variant={singleForm.type === 'SELL' ? 'default' : 'outline'}
                    className={`flex-1 ${singleForm.type === 'SELL' ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-border text-muted-foreground'}`}
                    onClick={() => updateSingleField('type', 'SELL')}
                  >
                    <TrendingDown size={16} className="mr-2" />
                    매도
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-muted-foreground">
                    거래일
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={singleForm.date}
                    onChange={(e) => updateSingleField('date', e.target.value)}
                    className="bg-muted/50 border-border text-foreground"
                  />
                </div>

                {/* 종목 검색 컴포넌트 */}
                <StockSearchInput
                  selectedCode={singleForm.ticker}
                  selectedName={singleForm.name}
                  onSelect={(code, name) => {
                    setSingleForm((prev) => ({ ...prev, ticker: code, name }));
                  }}
                  onClear={() => {
                    setSingleForm((prev) => ({ ...prev, ticker: '', name: '' }));
                  }}
                  resetKey={searchResetKey}
                />

                {/* 직접 입력 (검색되지 않는 종목용) */}
                {!singleForm.ticker && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ticker" className="text-muted-foreground text-xs">
                        종목코드 (직접입력)
                      </Label>
                      <Input
                        id="ticker"
                        value={singleForm.ticker}
                        onChange={(e) => updateSingleField('ticker', e.target.value)}
                        placeholder="예: AAPL"
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-muted-foreground text-xs">
                        종목명 (선택)
                      </Label>
                      <Input
                        id="name"
                        value={singleForm.name}
                        onChange={(e) => updateSingleField('name', e.target.value)}
                        placeholder="예: Apple"
                        className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-muted-foreground">
                      단가
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      value={singleForm.price || ''}
                      onChange={(e) => updateSingleField('price', Number(e.target.value))}
                      placeholder="0"
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-muted-foreground">
                      수량
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={singleForm.quantity || ''}
                      onChange={(e) => updateSingleField('quantity', Number(e.target.value))}
                      placeholder="0"
                      className="bg-muted/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {singleForm.price > 0 && singleForm.quantity > 0 && (
                  <div className={`p-3 rounded-xl border ${singleForm.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <p className={`text-sm text-center ${singleForm.type === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {singleForm.type === 'BUY' ? '매수' : '매도'} 총액: <span className="font-bold">₩{formatCurrency(singleForm.price * singleForm.quantity)}</span>
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    className={`w-full ${singleForm.type === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'} text-white`}
                    onClick={handleSaveSingle}
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
                    className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
                <div className="aspect-[3/4] bg-muted/50 rounded-xl flex items-center justify-center relative overflow-hidden border border-border">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Selected"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <p className="text-muted-foreground">이미지 로딩 중...</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      '거래내역 분석하기'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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

            {/* Photo Verify - Multiple Items */}
            {mode === 'photo-verify' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {multipleItems.length}건의 거래내역을 찾았습니다
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-emerald-500 hover:text-emerald-600"
                    onClick={toggleSelectAll}
                  >
                    {selectedItems.size === multipleItems.length ? '전체 해제' : '전체 선택'}
                  </Button>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {multipleItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-colors ${
                        selectedItems.has(idx)
                          ? item.type === 'BUY'
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(idx)}
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedItems.has(idx)
                              ? item.type === 'BUY'
                                ? 'bg-emerald-600 border-emerald-600'
                                : 'bg-red-600 border-red-600'
                              : 'border-muted-foreground/30'
                          }`}
                        >
                          {selectedItems.has(idx) && <Check size={12} className="text-white" />}
                        </button>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${item.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'}`}>
                                {item.type === 'BUY' ? '매수' : '매도'}
                              </span>
                              <span className="font-medium text-foreground text-sm">{item.name || item.ticker}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={item.date}
                              onChange={(e) => updateMultipleItem(idx, 'date', e.target.value)}
                              type="date"
                              className="h-8 text-xs bg-muted/50 border-border text-foreground"
                            />
                            <Input
                              value={item.ticker}
                              onChange={(e) => updateMultipleItem(idx, 'ticker', e.target.value)}
                              placeholder="종목코드"
                              className="h-8 text-xs bg-muted/50 border-border text-foreground"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <Input
                                type="number"
                                value={item.price || ''}
                                onChange={(e) => updateMultipleItem(idx, 'price', Number(e.target.value))}
                                placeholder="단가"
                                className="h-8 text-xs bg-muted/50 border-border text-foreground pr-8"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">원</span>
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => updateMultipleItem(idx, 'quantity', Number(e.target.value))}
                                placeholder="수량"
                                className="h-8 text-xs bg-muted/50 border-border text-foreground pr-8"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">주</span>
                            </div>
                          </div>

                          <div className={`text-xs text-right ${item.type === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>
                            총 ₩{formatCurrency(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedItems.size > 0 && (
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <p className="text-sm text-emerald-600 text-center">
                      선택된 {selectedItems.size}건의 총 거래금액:{' '}
                      <span className="font-bold">
                        ₩{formatCurrency(
                          multipleItems
                            .filter((_, idx) => selectedItems.has(idx))
                            .reduce((sum, item) => sum + item.price * item.quantity, 0)
                        )}
                      </span>
                    </p>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSaveMultiple}
                    disabled={isSaving || selectedItems.size === 0}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {selectedItems.size}건 저장하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      setImageSrc(null);
                      setMultipleItems([]);
                      setSelectedItems(new Set());
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
