"use client";

import { Button } from "@repo/design-system/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { Input } from "@repo/design-system/components/input";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, Trash2, Wallet, X } from "lucide-react";
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { queryKeys } from "../../../lib/query-client";
import { deleteHolding, getExchangeRate, saveHolding } from "../../actions/holding";
import { StockSearchInput } from "../../components/StockSearchInput";

export const CASH_TICKER = 'CASH';

export interface HoldingEditData {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  country: string;
}

interface HoldingInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editData?: HoldingEditData;
}

// 미국 마켓 여부 판별
function isUSMarket(market?: string): boolean {
  if (!market) return false;
  const usMarkets = ['NASDAQ', 'NYSE', 'AMEX', 'US_ETF'];
  return usMarkets.includes(market.toUpperCase());
}

// 기타자산 코드 (미국 티커로 오인 방지)
const ALTERNATIVE_ASSET_CODES = new Set(['BTC', 'ETH', 'XRP', 'SOL_CRYPTO', 'GOLD']);

// 티커로 미국 종목 여부 추정 (수동 입력 시 사용)
function isLikelyUSTicker(ticker: string): boolean {
  const cleaned = ticker.trim().toUpperCase();
  if (ALTERNATIVE_ASSET_CODES.has(cleaned)) return false;
  if (cleaned === CASH_TICKER) return false;
  return /^[A-Z]{1,5}$/.test(cleaned);
}

function formatNumber(value: string): string {
  const numbers = value.replace(/[^\d.]/g, "");
  const parts = numbers.split(".");
  if (parts[0]) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return parts.join(".");
}

function parseFormattedNumber(value: string): number {
  return Number.parseFloat(value.replace(/,/g, "")) || 0;
}

export function HoldingInputModal({
  isOpen,
  onClose,
  onSuccess,
  editData,
}: HoldingInputModalProps): JSX.Element {
  const queryClient = useQueryClient();

  const [ticker, setTicker] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [market, setMarket] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState<string>("");
  const [avgPrice, setAvgPrice] = useState<string>("");
  const [cashKrw, setCashKrw] = useState<string>("");
  const [cashUsd, setCashUsd] = useState<string>("");
  const [exchangeRateVal, setExchangeRateVal] = useState<number>(1400);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);

  const isEditMode = !!editData;
  const isCash = ticker.trim().toUpperCase() === CASH_TICKER;

  // 통화 결정: 현금은 항상 KRW, 그 외는 market 또는 티커 패턴으로 추정
  const isUS = isCash ? false : (market ? isUSMarket(market) : isLikelyUSTicker(ticker));
  const currency = isUS ? "USD" : "KRW";

  // 현금 모드: 환율 조회
  useEffect(() => {
    if (isCash && isOpen) {
      getExchangeRate().then(rate => {
        if (rate > 0) setExchangeRateVal(rate);
      }).catch(() => {});
    }
  }, [isCash, isOpen]);

  // 현금 합계 (원화 환산)
  const cashTotal = parseFormattedNumber(cashKrw) + parseFormattedNumber(cashUsd) * exchangeRateVal;

  // editData가 변경되면 폼 채우기
  useEffect(() => {
    if (editData && isOpen) {
      setTicker(editData.ticker);
      setName(editData.name);
      setMarket(undefined);
      if (editData.ticker === CASH_TICKER) {
        // 현금: quantity=원화, avgPrice=달러
        setCashKrw(formatNumber(String(editData.quantity)));
        setCashUsd(formatNumber(String(editData.avgPrice)));
      } else {
        setQuantity(formatNumber(String(editData.quantity)));
        setAvgPrice(formatNumber(String(editData.avgPrice)));
      }
      setError(null);
      setShowManualInput(true);
    }
  }, [editData, isOpen]);

  const handleQuantityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatNumber(e.target.value);
      setQuantity(formatted);
      setError(null);
    },
    []
  );

  const handleAvgPriceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatNumber(e.target.value);
      setAvgPrice(formatted);
      setError(null);
    },
    []
  );

  const handleCashKrwChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCashKrw(formatNumber(e.target.value));
      setError(null);
    },
    []
  );

  const handleCashUsdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCashUsd(formatNumber(e.target.value));
      setError(null);
    },
    []
  );

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  const resetForm = useCallback(() => {
    setTicker("");
    setName("");
    setMarket(undefined);
    setQuantity("");
    setAvgPrice("");
    setCashKrw("");
    setCashUsd("");
    setError(null);
    setShowManualInput(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleStockSelect = useCallback((code: string, selectedName: string, selectedMarket?: string) => {
    setTicker(code);
    setName(selectedName);
    setMarket(selectedMarket);
    setError(null);
  }, []);

  const handleStockClear = useCallback(() => {
    setTicker("");
    setName("");
    setMarket(undefined);
  }, []);

  const handleCashSelect = useCallback(() => {
    setTicker(CASH_TICKER);
    setName("현금");
    setShowManualInput(true);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (isCash) {
      // 현금 모드
      const krwAmount = parseFormattedNumber(cashKrw);
      const usdAmount = parseFormattedNumber(cashUsd);

      if (krwAmount <= 0 && usdAmount <= 0) {
        setError("금액을 입력해주세요.");
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const result = await saveHolding({
          country: "한국",
          ticker: CASH_TICKER,
          name: "현금",
          quantity: krwAmount,
          avgPrice: usdAmount,
          currency: "KRW",
          mode: 'edit', // 현금은 항상 덮어쓰기
        });

        if (result.success) {
          handleClose();
          onSuccess?.();
          await queryClient.invalidateQueries({ queryKey: queryKeys.portfolio, refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' });
        } else {
          setError(result.error || "저장에 실패했습니다.");
        }
      } catch (err) {
        setError("저장 중 오류가 발생했습니다.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 일반 종목 모드
    const tickerVal = ticker.trim().toUpperCase();
    const nameVal = name.trim();
    const quantityNum = parseFormattedNumber(quantity);
    const avgPriceNum = parseFormattedNumber(avgPrice);

    if (!tickerVal) {
      setError("종목코드를 입력해주세요.");
      return;
    }

    if (!nameVal) {
      setError("종목명을 입력해주세요.");
      return;
    }

    if (quantityNum <= 0) {
      setError("수량을 입력해주세요.");
      return;
    }

    if (avgPriceNum <= 0) {
      setError("평단가를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await saveHolding({
        country: isUS ? "미국" : "한국",
        ticker: tickerVal,
        name: nameVal,
        quantity: quantityNum,
        avgPrice: avgPriceNum,
        currency,
        mode: isEditMode ? 'edit' : 'add',
      });

      if (result.success) {
        handleClose();
        onSuccess?.();
        await queryClient.invalidateQueries({ queryKey: queryKeys.portfolio, refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' });
      } else {
        setError(result.error || "저장에 실패했습니다.");
      }
    } catch (err) {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isCash,
    cashKrw,
    cashUsd,
    ticker,
    name,
    quantity,
    avgPrice,
    isUS,
    currency,
    isEditMode,
    queryClient,
    handleClose,
    onSuccess,
  ]);

  const handleDelete = useCallback(async () => {
    if (!editData?.ticker) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteHolding(editData.ticker);

      if (result.success) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.portfolio, refetchType: 'all' }),
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' }),
        ]);
        handleClose();
        onSuccess?.();
      } else {
        setError(result.error || "삭제에 실패했습니다.");
      }
    } catch (err) {
      setError("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [editData?.ticker, queryClient, handleClose, onSuccess]);

  const isFormValid = isCash
    ? (parseFormattedNumber(cashKrw) > 0 || parseFormattedNumber(cashUsd) > 0)
    : (ticker.trim() &&
      name.trim() &&
      parseFormattedNumber(quantity) > 0 &&
      parseFormattedNumber(avgPrice) > 0);

  const modalTitle = isCash
    ? (isEditMode ? "현금 수정" : "현금 추가")
    : (isEditMode ? "종목 수정" : "종목 추가");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[420px] bg-popover border-border rounded-[24px] p-0 gap-0"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "min(420px, calc(100vw - 2rem))",
        }}
      >
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border min-w-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              {isCash ? (
                <Wallet className="w-5 h-5 text-primary" />
              ) : (
                <Briefcase className="w-5 h-5 text-primary" />
              )}
              {modalTitle}
            </DialogTitle>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 space-y-4 min-w-0">
          {isCash ? (
            /* 현금 모드: 원화/달러 입력 */
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  원화 (₩)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={cashKrw}
                  onChange={handleCashKrwChange}
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  달러 ($)
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={cashUsd}
                  onChange={handleCashUsdChange}
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className="text-right"
                />
              </div>
              {(parseFormattedNumber(cashKrw) > 0 || parseFormattedNumber(cashUsd) > 0) && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">합계 (원화환산)</span>
                    <span className="font-semibold text-foreground">
                      {formatNumber(String(Math.round(cashTotal)))}원
                    </span>
                  </div>
                  {parseFormattedNumber(cashUsd) > 0 && (
                    <div className="text-xs text-muted-foreground text-right">
                      적용 환율: {exchangeRateVal.toLocaleString()}원/USD
                    </div>
                  )}
                </div>
              )}
              {/* 현금 모드에서 종목 검색으로 돌아가기 (신규 추가 시만) */}
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowManualInput(false);
                    handleStockClear();
                    setCashKrw("");
                    setCashUsd("");
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                >
                  <span className="underline">종목 검색으로 돌아가기</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* 종목 검색 또는 수동 입력 */}
              {!isEditMode && !showManualInput ? (
                <>
                  <StockSearchInput
                    selectedCode={ticker}
                    selectedName={name}
                    onSelect={handleStockSelect}
                    onClear={handleStockClear}
                    label="종목"
                    placeholder="종목명 또는 종목코드 검색"
                  />

                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={handleCashSelect}
                      className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                    >
                      <span className="underline">현금 추가하기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                    >
                      찾는 종목이 없나요? <span className="underline">직접 입력하기</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 종목코드 */}
                  <div className="space-y-2">
                    <label
                      htmlFor="ticker"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      종목코드 (티커)
                    </label>
                    <Input
                      type="text"
                      value={ticker}
                      onChange={(e) => {
                        setTicker(e.target.value.toUpperCase());
                        setMarket(undefined);
                        setError(null);
                      }}
                      placeholder="AAPL, 005930, 360750..."
                      className="uppercase disabled:opacity-60"
                      disabled={isEditMode}
                    />
                    {isEditMode && (
                      <p className="text-xs text-muted-foreground">
                        종목코드는 수정할 수 없습니다.
                      </p>
                    )}
                  </div>

                  {/* 종목명 */}
                  <div className="space-y-2">
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      종목명
                    </label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                      }}
                      placeholder="Apple Inc., 삼성전자..."
                    />
                  </div>

                  {/* 검색으로 돌아가기 버튼 (신규 입력 시만) */}
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualInput(false);
                        handleStockClear();
                      }}
                      className="w-full text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                    >
                      <span className="underline">종목 검색으로 돌아가기</span>
                    </button>
                  )}
                </>
              )}

              {/* 통화 표시 (선택된 종목이 있을 때) */}
              {ticker && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">통화:</span>
                  <span className={`text-sm font-medium ${isUS ? 'text-blue-600' : 'text-emerald-600'}`}>
                    {isUS ? '미국 (USD)' : '한국 (KRW)'}
                  </span>
                </div>
              )}

              {/* 수량 & 평단가 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label
                    htmlFor="quantity"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    수량
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={handleQuantityChange}
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className="text-right"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="avgPrice"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    평단가 ({currency === "USD" ? "$" : "₩"})
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={avgPrice}
                    onChange={handleAvgPriceChange}
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className="text-right"
                  />
                </div>
              </div>
            </>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-2 min-w-0">
          {isEditMode && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/10"
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled={isSubmitting || isDeleting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isDeleting || !isFormValid}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
