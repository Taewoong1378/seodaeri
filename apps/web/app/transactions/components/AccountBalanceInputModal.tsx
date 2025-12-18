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
import { Loader2, PiggyBank, X } from "lucide-react";
import type { JSX } from "react";
import { useCallback, useState } from "react";
import { queryKeys } from "../../../lib/query-client";
import { saveAccountBalance } from "../../actions/account-balance";
import { YearMonthPicker } from "./WheelPicker";

interface AccountBalanceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatNumber(value: string): string {
  const numbers = value.replace(/[^\d]/g, "");
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseFormattedNumber(value: string): number {
  return Number.parseInt(value.replace(/,/g, ""), 10) || 0;
}

export function AccountBalanceInputModal({
  isOpen,
  onClose,
}: AccountBalanceInputModalProps): JSX.Element {
  const queryClient = useQueryClient();

  // 현재 연월
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [balance, setBalance] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBalanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatNumber(e.target.value);
      setBalance(formatted);
      setError(null);
    },
    []
  );

  const resetForm = useCallback(() => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setBalance("");
    setError(null);
  }, [currentYear, currentMonth]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(async () => {
    const balanceNum = parseFormattedNumber(balance);

    if (balanceNum <= 0) {
      setError("계좌총액을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(
        2,
        "0"
      )}`;

      const result = await saveAccountBalance({
        yearMonth,
        balance: balanceNum,
      });

      if (result.success) {
        // 캐시 무효화
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        handleClose();
      } else {
        setError(result.error || "저장에 실패했습니다.");
      }
    } catch (err) {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [balance, selectedYear, selectedMonth, queryClient, handleClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-[380px] bg-popover border-border rounded-[24px] p-0 gap-0 overflow-hidden"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "min(380px, calc(100vw - 2rem))",
        }}
      >
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              계좌총액 입력
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
        <div className="p-5 space-y-5">
          {/* 연월 선택 - Wheel Picker */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-muted-foreground"
              htmlFor="year-month-picker"
            >
              연월 선택
            </label>
            <YearMonthPicker
              year={selectedYear}
              month={selectedMonth}
              onYearChange={setSelectedYear}
              onMonthChange={setSelectedMonth}
              startYear={currentYear - 20}
              endYear={currentYear + 1}
            />
          </div>

          {/* 계좌총액 입력 */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-muted-foreground"
              htmlFor="balance"
            >
              계좌총액
            </label>
            <div className="relative">
              <Input
                type="text"
                inputMode="numeric"
                value={balance}
                onChange={handleBalanceChange}
                placeholder="0"
                className="text-right pr-10 text-lg font-bold"
                accentColor="emerald"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                원
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              해당 월 말 기준 전체 계좌의 총 평가금액을 입력하세요.
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || parseFormattedNumber(balance) <= 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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
