"use client";

import { toast } from "@repo/design-system";
import { Button } from "@repo/design-system/components/button";
import { DatePicker } from "@repo/design-system/components/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { Input } from "@repo/design-system/components/input";
import { Label } from "@repo/design-system/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/select";
import { Camera, Check, Loader2, Pen, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSaveDividend, useSaveDividends } from "../../../hooks";
import type { DividendInput } from "../../actions/dividend";
import { analyzeDividendImage } from "../../actions/ocr";
import { StockSearchInput } from "../../components/StockSearchInput";

type InputMode = "select" | "manual" | "photo-preview" | "photo-verify";

export function DividendInputModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>("select");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 종목 검색 리셋용 키
  const [searchResetKey, setSearchResetKey] = useState(0);

  // 검색으로 종목을 선택했는지 여부 (직접 입력 UI 표시 제어용)
  const [isSearchSelected, setIsSearchSelected] = useState(false);

  // TanStack Query mutations
  const { mutate: saveDividend, isPending: isSavingSingle } = useSaveDividend();
  const { mutate: saveDividends, isPending: isSavingMultiple } =
    useSaveDividends();

  const isSaving = isSavingSingle || isSavingMultiple;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 계좌 유형 상태
  const [account, setAccount] = useState<string>("일반 계좌");

  // 단일 입력용 (직접 입력)
  const [singleForm, setSingleForm] = useState<DividendInput>({
    date: new Date().toISOString().split("T")[0] || "",
    ticker: "",
    name: "",
    amountKRW: 0,
    amountUSD: 0,
  });

  // 다중 입력용 (사진 분석)
  const [multipleItems, setMultipleItems] = useState<DividendInput[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  // 다중 항목의 포맷된 금액 상태
  const [formattedMultipleAmountsKRW, setFormattedMultipleAmountsKRW] = useState<string[]>([]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const resetState = () => {
    setMode("select");
    setImageSrc(null);
    setSingleForm({
      date: new Date().toISOString().split("T")[0] || "",
      ticker: "",
      name: "",
      amountKRW: 0,
      amountUSD: 0,
    });
    setAccount("일반 계좌");
    setMultipleItems([]);
    setSelectedItems(new Set());
    setSearchResetKey((prev) => prev + 1);
    setIsSearchSelected(false);
    setFormattedAmountKRW("");
    setFormattedMultipleAmountsKRW([]);
  };

  const handleManualMode = () => {
    setMode("manual");
  };

  const handlePhotoMode = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택해주세요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setImageSrc(base64);
      setMode("photo-preview");
    };
    reader.onerror = () => {
      toast.error("이미지를 불러오는데 실패했습니다.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleAnalyze = async () => {
    if (!imageSrc) return;

    setIsAnalyzing(true);
    try {
      const results = await analyzeDividendImage(imageSrc);
      if (results.length > 0) {
        setMultipleItems(results);
        // 모든 항목 선택
        setSelectedItems(new Set(results.map((_, idx) => idx)));
        // 포맷된 금액 초기화
        setFormattedMultipleAmountsKRW(
          results.map((item) =>
            item.amountKRW ? formatNumberWithComma(String(item.amountKRW)) : ""
          )
        );
        setMode("photo-verify");
      } else {
        toast.error("배당내역을 찾을 수 없습니다. 다시 시도해주세요.");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveSingle = () => {
    if (!singleForm.ticker) {
      toast.error("종목코드를 입력해주세요.");
      return;
    }
    if (singleForm.amountKRW === 0 && singleForm.amountUSD === 0) {
      toast.error("배당금을 입력해주세요.");
      return;
    }

    saveDividend({ ...singleForm, account }, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success("배당내역이 저장되었습니다.");
          handleOpenChange(false);
        } else {
          toast.error(result.error || "저장에 실패했습니다.");
        }
      },
      onError: (error) => {
        console.error("Save error:", error);
        toast.error("저장 중 오류가 발생했습니다.");
      },
    });
  };

  const handleSaveMultiple = () => {
    const itemsToSave = multipleItems
      .filter((_, idx) => selectedItems.has(idx))
      .map((item) => ({ ...item, account }));

    if (itemsToSave.length === 0) {
      toast.error("저장할 항목을 선택해주세요.");
      return;
    }

    saveDividends(itemsToSave, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(`${itemsToSave.length}건의 배당내역이 저장되었습니다.`);
          handleOpenChange(false);
        } else {
          toast.error(result.error || "저장에 실패했습니다.");
        }
      },
      onError: (error) => {
        console.error("Save error:", error);
        toast.error("저장 중 오류가 발생했습니다.");
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

  const updateMultipleItem = (
    idx: number,
    field: keyof DividendInput,
    value: string | number
  ) => {
    setMultipleItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (idx: number) => {
    setMultipleItems((prev) => prev.filter((_, i) => i !== idx));
    setFormattedMultipleAmountsKRW((prev) => prev.filter((_, i) => i !== idx));
    const newSelected = new Set(selectedItems);
    newSelected.delete(idx);
    // Adjust indices
    const adjusted = new Set<number>();
    for (const i of newSelected) {
      if (i > idx) {
        adjusted.add(i - 1);
      } else {
        adjusted.add(i);
      }
    }
    setSelectedItems(adjusted);
  };

  const handleMultipleAmountKRWChange = (idx: number, value: string) => {
    const formatted = formatNumberWithComma(value);
    setFormattedMultipleAmountsKRW((prev) => {
      const newArr = [...prev];
      newArr[idx] = formatted;
      return newArr;
    });
    updateMultipleItem(idx, "amountKRW", parseFormattedNumber(formatted));
  };

  const updateSingleField = (
    field: keyof DividendInput,
    value: string | number
  ) => {
    setSingleForm((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  // 천 단위 콤마 포맷팅 (입력용)
  const formatNumberWithComma = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, "");
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseFormattedNumber = (value: string): number => {
    return Number.parseInt(value.replace(/,/g, ""), 10) || 0;
  };

  // 원화 배당금 포맷된 문자열 상태
  const [formattedAmountKRW, setFormattedAmountKRW] = useState<string>("");

  const handleAmountKRWChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithComma(e.target.value);
    setFormattedAmountKRW(formatted);
    updateSingleField("amountKRW", parseFormattedNumber(formatted));
  };

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

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
              className="h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 active:bg-blue-800 text-white absolute right-5 bottom-0 pointer-events-auto animate-in zoom-in duration-300 transition-all border-4 border-white/20"
            >
              <Pen size={24} />
            </Button>
          </div>,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[28px] bg-white border-0 shadow-2xl"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "min(425px, calc(100vw - 2rem))",
          }}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
                배당 내역 추가
              </DialogTitle>
            </DialogHeader>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </Button>
            </DialogClose>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {/* Mode Selection */}
            {mode === "select" && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-gray-500 text-center mb-8">
                  배당금을 기록할 방법을 선택해주세요
                </p>
                <Button
                  className="w-full h-24 bg-blue-50 hover:bg-blue-100 border-2 border-transparent hover:border-blue-200 text-gray-900 flex flex-col gap-3 rounded-2xl transition-all"
                  variant="ghost"
                  onClick={handleManualMode}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Pen size={20} />
                  </div>
                  <span className="font-semibold">직접 입력하기</span>
                </Button>
                <Button
                  className="w-full h-24 bg-emerald-50 hover:bg-emerald-100 border-2 border-transparent hover:border-emerald-200 text-gray-900 flex flex-col gap-3 rounded-2xl transition-all"
                  variant="ghost"
                  onClick={handlePhotoMode}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Camera size={20} />
                  </div>
                  <span className="font-semibold">
                    캡쳐한 사진으로 자동 입력 (여러 건)
                  </span>
                </Button>
              </div>
            )}

            {/* Manual Input Form */}
            {mode === "manual" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    배당 입금일
                  </Label>
                  <DatePicker
                    value={singleForm.date}
                    onChange={(date) => updateSingleField("date", date)}
                    placeholder="날짜 선택"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    계좌 유형
                  </Label>
                  <Select value={account} onValueChange={setAccount}>
                    <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="bg-white border-none shadow-xl p-1 min-w-(--radix-select-trigger-width)"
                      position="popper"
                      sideOffset={4}
                    >
                      <SelectItem
                        value="일반 계좌"
                        className="rounded-lg focus:bg-blue-50 focus:text-blue-600 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3 mb-1"
                      >
                        일반 계좌
                      </SelectItem>
                      <SelectItem
                        value="절세 계좌"
                        className="rounded-lg focus:bg-emerald-50 focus:text-emerald-600 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3"
                      >
                        절세 계좌
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 종목 검색 컴포넌트 */}
                <StockSearchInput
                  selectedCode={isSearchSelected ? singleForm.ticker : ""}
                  selectedName={isSearchSelected ? singleForm.name : ""}
                  onSelect={(code, name) => {
                    setSingleForm((prev) => ({ ...prev, ticker: code, name }));
                    setIsSearchSelected(true);
                  }}
                  onClear={() => {
                    setSingleForm((prev) => ({
                      ...prev,
                      ticker: "",
                      name: "",
                    }));
                    setIsSearchSelected(false);
                  }}
                  resetKey={searchResetKey}
                  label="종목 검색"
                />

                {/* 직접 입력 (검색되지 않는 종목용 - 미국주식 등) */}
                {!isSearchSelected && (
                  <div className="p-4 bg-gray-50 border border-gray-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1 h-4 bg-gray-300 rounded-full" />
                      <p className="text-xs font-semibold text-gray-500">
                        직접 입력 (검색 결과 없을 때)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="ticker"
                          className="text-xs font-medium text-gray-500"
                        >
                          종목코드
                        </Label>
                        <Input
                          id="ticker"
                          value={singleForm.ticker}
                          onChange={(e) =>
                            updateSingleField(
                              "ticker",
                              e.target.value.toUpperCase()
                            )
                          }
                          placeholder="예: AAPL"
                          className="h-11 text-sm uppercase"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="text-xs font-medium text-gray-500"
                        >
                          종목명
                        </Label>
                        <Input
                          id="name"
                          value={singleForm.name}
                          onChange={(e) =>
                            updateSingleField("name", e.target.value)
                          }
                          placeholder="예: Apple"
                          className="h-11 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="amountKRW"
                      className="text-sm font-medium text-gray-700"
                    >
                      원화 배당금
                    </Label>
                    <div className="relative">
                      <Input
                        id="amountKRW"
                        type="text"
                        inputMode="numeric"
                        value={formattedAmountKRW}
                        onChange={handleAmountKRWChange}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="h-12 text-right pr-8 font-medium"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        ₩
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="amountUSD"
                      className="text-sm font-medium text-gray-700"
                    >
                      외화 배당금 ($)
                    </Label>
                    <div className="relative">
                      <Input
                        id="amountUSD"
                        type="number"
                        step="0.01"
                        value={singleForm.amountUSD || ""}
                        onChange={(e) =>
                          updateSingleField("amountUSD", Number(e.target.value))
                        }
                        placeholder="0.00"
                        className="h-12 text-right pr-8 font-medium"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        $
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-3">
                  <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-medium text-base transition-all active:scale-[0.98]"
                    onClick={handleSaveSingle}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        저장하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    onClick={() => setMode("select")}
                    disabled={isSaving}
                  >
                    뒤로가기
                  </Button>
                </div>
              </div>
            )}

            {/* Photo Preview */}
            {mode === "photo-preview" && (
              <div className="space-y-6">
                <div className="aspect-[3/4] bg-gray-50 rounded-2xl flex items-center justify-center relative overflow-hidden border border-gray-100 shadow-inner">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt="Selected"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-sm">이미지 로딩 중...</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-medium text-base"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        분석 중...
                      </>
                    ) : (
                      "이 사진으로 분석하기"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    onClick={() => {
                      setImageSrc(null);
                      setMode("select");
                    }}
                    disabled={isAnalyzing}
                  >
                    다시 선택하기
                  </Button>
                </div>
              </div>
            )}

            {/* Photo Verify - Multiple Items */}
            {mode === "photo-verify" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    계좌 유형
                  </Label>
                  <Select value={account} onValueChange={setAccount}>
                    <SelectTrigger className="w-full h-11 bg-gray-50 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="bg-white border-none shadow-xl p-1 min-w-(--radix-select-trigger-width)"
                      position="popper"
                      sideOffset={4}
                    >
                      <SelectItem
                        value="일반 계좌"
                        className="rounded-lg focus:bg-blue-50 focus:text-blue-600 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3 mb-1"
                      >
                        일반 계좌
                      </SelectItem>
                      <SelectItem
                        value="절세 계좌"
                        className="rounded-lg focus:bg-emerald-50 focus:text-emerald-600 data-[state=checked]:bg-emerald-50 data-[state=checked]:text-emerald-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3"
                      >
                        절세 계좌
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between px-1">
                  <p className="text-sm font-medium text-gray-600">
                    <span className="text-blue-600 font-bold">
                      {multipleItems.length}건
                    </span>
                    을 찾았습니다
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={toggleSelectAll}
                  >
                    {selectedItems.size === multipleItems.length
                      ? "전체 해제"
                      : "전체 선택"}
                  </Button>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {multipleItems.map((item, idx) => (
                    <div
                      key={`${item.name}-${item.date}-${idx}`}
                      className={`p-4 rounded-2xl border transition-all duration-200 ${
                        selectedItems.has(idx)
                          ? "bg-blue-50/50 border-blue-200 shadow-sm"
                          : "bg-white border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(idx)}
                          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            selectedItems.has(idx)
                              ? "bg-blue-600 border-blue-600 shadow-sm"
                              : "bg-white border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {selectedItems.has(idx) && (
                            <Check size={14} className="text-white" />
                          )}
                        </button>

                        <div className="flex-1 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900">
                              {item.name || item.ticker}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              value={item.date}
                              onChange={(e) =>
                                updateMultipleItem(idx, "date", e.target.value)
                              }
                              type="date"
                              className="h-10 text-xs bg-white border-gray-200 rounded-lg"
                            />
                            <Input
                              value={item.ticker}
                              onChange={(e) =>
                                updateMultipleItem(
                                  idx,
                                  "ticker",
                                  e.target.value
                                )
                              }
                              placeholder="종목코드"
                              className="h-10 text-xs bg-white border-gray-200 rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={formattedMultipleAmountsKRW[idx] || ""}
                                onChange={(e) =>
                                  handleMultipleAmountKRWChange(idx, e.target.value)
                                }
                                onFocus={handleInputFocus}
                                placeholder="원화"
                                className="h-10 text-xs bg-white border-gray-200 pr-7 rounded-lg text-right"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                ₩
                              </span>
                            </div>
                            <div className="relative">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amountUSD || ""}
                                onChange={(e) =>
                                  updateMultipleItem(
                                    idx,
                                    "amountUSD",
                                    Number(e.target.value)
                                  )
                                }
                                onFocus={handleInputFocus}
                                placeholder="외화"
                                className="h-10 text-xs bg-white border-gray-200 pr-7 rounded-lg text-right"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                $
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedItems.size > 0 && (
                  <div className="p-4 bg-gray-900 rounded-2xl shadow-lg text-white animate-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-300">
                        총 예상 배당금
                      </span>
                      <span className="text-lg font-bold">
                        ₩
                        {formatCurrency(
                          multipleItems
                            .filter((_, idx) => selectedItems.has(idx))
                            .reduce(
                              (sum, item) =>
                                sum + item.amountKRW + item.amountUSD * 1450,
                              0
                            )
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 text-right">
                      * 환율 1,450원 기준 단순 합산
                    </p>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-medium text-base"
                    onClick={handleSaveMultiple}
                    disabled={isSaving || selectedItems.size === 0}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        {selectedItems.size}건 저장하기
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full h-12 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    onClick={() => {
                      if (
                        confirm(
                          "입력된 내용이 초기화됩니다. 다시 시작하시겠습니까?"
                        )
                      ) {
                        setImageSrc(null);
                        setMultipleItems([]);
                        setSelectedItems(new Set());
                        setMode("select");
                      }
                    }}
                    disabled={isSaving}
                  >
                    다시 입력하기
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
