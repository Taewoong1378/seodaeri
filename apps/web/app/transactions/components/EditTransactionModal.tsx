"use client";

import { Button } from "@repo/design-system/components/button";
import { DatePicker } from "@repo/design-system/components/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/dialog";
import { Input } from "@repo/design-system/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/select";
import { useQueryClient } from "@tanstack/react-query";
import { Banknote, Loader2, PiggyBank, Wallet, X } from "lucide-react";
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { queryKeys } from "../../../lib/query-client";
import {
  type AccountBalanceRecord,
  updateAccountBalance,
} from "../../actions/account-balance";
import { updateDeposit } from "../../actions/deposit";
import { updateDividend } from "../../actions/dividend";
import { StockSearchInput } from "../../components/StockSearchInput";
import { YearMonthPicker } from "./WheelPicker";

export type EditType = "balance" | "dividend" | "deposit";

interface Transaction {
  id: string;
  ticker: string;
  name: string | null;
  type: "BUY" | "SELL" | "DIVIDEND" | "DEPOSIT" | "WITHDRAW";
  price: number;
  quantity: number;
  total_amount: number;
  trade_date: string;
  sheet_synced: boolean;
  created_at: string;
  source: "app" | "sheet";
  account?: string;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editType: EditType;
  balanceData?: AccountBalanceRecord;
  transactionData?: Transaction;
}

function formatNumber(value: string): string {
  const numbers = value.replace(/[^\d]/g, "");
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseFormattedNumber(value: string): number {
  return Number.parseInt(value.replace(/,/g, ""), 10) || 0;
}

export function EditTransactionModal({
  isOpen,
  onClose,
  editType,
  balanceData,
  transactionData,
}: EditTransactionModalProps): JSX.Element {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 계좌총액용 상태
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [balance, setBalance] = useState<string>("");

  // 배당용 상태
  const [dividendDate, setDividendDate] = useState<string>("");
  const [dividendTicker, setDividendTicker] = useState<string>("");
  const [dividendName, setDividendName] = useState<string>("");
  const [dividendAmountKRW, setDividendAmountKRW] = useState<string>("");
  const [dividendAmountUSD, setDividendAmountUSD] = useState<string>("0");

  // 입출금용 상태
  const [depositDate, setDepositDate] = useState<string>("");
  const [depositType, setDepositType] = useState<"DEPOSIT" | "WITHDRAW">(
    "DEPOSIT"
  );
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositAccount, setDepositAccount] = useState<string>("일반계좌1");
  const [depositMemo, setDepositMemo] = useState<string>("");

  // 현재 연도
  const currentYear = new Date().getFullYear();

  // 계좌 옵션
  const accountOptions = [
    "일반계좌1",
    "일반계좌2",
    "개인연금1",
    "개인연금2",
    "IRP 1",
    "IRP 2",
    "ISA",
    "퇴직연금DC",
  ];

  // 초기값 설정
  useEffect(() => {
    if (!isOpen) return;

    if (editType === "balance" && balanceData) {
      setSelectedYear(balanceData.year);
      setSelectedMonth(balanceData.month);
      setBalance(formatNumber(String(balanceData.balance)));
    } else if (editType === "dividend" && transactionData) {
      const dateStr =
        transactionData.trade_date.split("T")[0] || transactionData.trade_date;
      setDividendDate(dateStr);
      setDividendTicker(transactionData.ticker);
      setDividendName(transactionData.name || "");
      setDividendAmountKRW(formatNumber(String(transactionData.total_amount)));
      setDividendAmountUSD("0");
    } else if (editType === "deposit" && transactionData) {
      const dateStr =
        transactionData.trade_date.split("T")[0] || transactionData.trade_date;
      setDepositDate(dateStr);
      setDepositType(transactionData.type as "DEPOSIT" | "WITHDRAW");
      setDepositAmount(formatNumber(String(transactionData.total_amount)));
      setDepositAccount(transactionData.account || "일반계좌1");
      setDepositMemo(transactionData.name || "");
    }

    setError(null);
  }, [isOpen, editType, balanceData, transactionData]);

  const handleClose = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    // 모바일 키보드가 올라온 후 스크롤
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let result: { success: boolean; error?: string };

      if (editType === "balance" && balanceData) {
        const newYearMonth = `${selectedYear}-${String(selectedMonth).padStart(
          2,
          "0"
        )}`;
        result = await updateAccountBalance({
          originalYearMonth: balanceData.yearMonth,
          originalBalance: balanceData.balance,
          newYearMonth,
          newBalance: parseFormattedNumber(balance),
        });
      } else if (editType === "dividend" && transactionData) {
        result = await updateDividend({
          originalDate:
            transactionData.trade_date.split("T")[0] ||
            transactionData.trade_date,
          originalTicker: transactionData.ticker,
          originalAmountKRW: transactionData.total_amount,
          originalAmountUSD: 0,
          newDate: dividendDate,
          newTicker: dividendTicker,
          newName: dividendName,
          newAmountKRW: parseFormattedNumber(dividendAmountKRW),
          newAmountUSD: parseFloat(dividendAmountUSD) || 0,
        });
      } else if (editType === "deposit" && transactionData) {
        result = await updateDeposit({
          originalDate:
            transactionData.trade_date.split("T")[0] ||
            transactionData.trade_date,
          originalType: transactionData.type as "DEPOSIT" | "WITHDRAW",
          originalAmount: transactionData.total_amount,
          newDate: depositDate,
          newType: depositType,
          newAmount: parseFormattedNumber(depositAmount),
          newAccount: depositAccount,
          newMemo: depositMemo,
        });
      } else {
        result = { success: false, error: "잘못된 요청입니다." };
      }

      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        handleClose();
      } else {
        setError(result.error || "수정에 실패했습니다.");
      }
    } catch (err) {
      setError("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editType,
    balanceData,
    transactionData,
    selectedYear,
    selectedMonth,
    balance,
    dividendDate,
    dividendTicker,
    dividendName,
    dividendAmountKRW,
    dividendAmountUSD,
    depositDate,
    depositType,
    depositAmount,
    depositAccount,
    depositMemo,
    queryClient,
    handleClose,
  ]);

  const getTitle = () => {
    switch (editType) {
      case "balance":
        return "계좌총액 수정";
      case "dividend":
        return "배당내역 수정";
      case "deposit":
        return "입출금내역 수정";
    }
  };

  const getIcon = () => {
    switch (editType) {
      case "balance":
        return <PiggyBank className="w-5 h-5 text-emerald-500" />;
      case "dividend":
        return <Banknote className="w-5 h-5 text-blue-500" />;
      case "deposit":
        return <Wallet className="w-5 h-5 text-purple-500" />;
    }
  };

  const getButtonColor = () => {
    switch (editType) {
      case "balance":
        return "bg-emerald-600 hover:bg-emerald-700";
      case "dividend":
        return "bg-blue-600 hover:bg-blue-700";
      case "deposit":
        return "bg-purple-600 hover:bg-purple-700";
    }
  };

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
        <DialogHeader className="p-5 pb-0 flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            {getIcon()}
            <DialogTitle className="text-lg font-bold text-foreground">
              {getTitle()}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* 계좌총액 폼 */}
          {editType === "balance" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  연월
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  계좌총액
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={balance}
                    onChange={(e) => setBalance(formatNumber(e.target.value))}
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className="text-right pr-10 text-lg font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    원
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 배당 폼 */}
          {editType === "dividend" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  날짜
                </label>
                <DatePicker
                  value={dividendDate}
                  onChange={(date) => setDividendDate(date)}
                  placeholder="날짜 선택"
                />
              </div>
              <StockSearchInput
                selectedCode={dividendTicker}
                selectedName={dividendName}
                onSelect={(code, name) => {
                  setDividendTicker(code);
                  setDividendName(name);
                }}
                onClear={() => {
                  setDividendTicker("");
                  setDividendName("");
                }}
                label="종목"
                placeholder="종목명 또는 종목코드 검색"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  배당금 (원화)
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={dividendAmountKRW}
                    onChange={(e) =>
                      setDividendAmountKRW(formatNumber(e.target.value))
                    }
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className="text-right pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    원
                  </span>
                </div>
              </div>
            </>
          )}

          {/* 입출금 폼 */}
          {editType === "deposit" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  날짜
                </label>
                <DatePicker
                  value={depositDate}
                  onChange={(date) => setDepositDate(date)}
                  placeholder="날짜 선택"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  구분
                </label>
                <Select
                  value={depositType}
                  onValueChange={(val) =>
                    setDepositType(val as "DEPOSIT" | "WITHDRAW")
                  }
                >
                  <SelectTrigger className="bg-muted/50 border-border text-foreground h-12 focus:ring-purple-500/30 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-popover border-none shadow-xl p-1 min-w-(--radix-select-trigger-width)"
                    position="popper"
                    sideOffset={4}
                  >
                    <SelectItem
                      value="DEPOSIT"
                      className="rounded-lg focus:bg-purple-50 focus:text-purple-600 data-[state=checked]:bg-purple-50 data-[state=checked]:text-purple-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3 mb-1"
                    >
                      입금
                    </SelectItem>
                    <SelectItem
                      value="WITHDRAW"
                      className="rounded-lg focus:bg-orange-50 focus:text-orange-600 data-[state=checked]:bg-orange-50 data-[state=checked]:text-orange-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3"
                    >
                      출금
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  계좌
                </label>
                <Select
                  value={depositAccount}
                  onValueChange={setDepositAccount}
                >
                  <SelectTrigger className="bg-muted/50 border-border text-foreground h-12 focus:ring-purple-500/30 focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-popover border-none shadow-xl p-1 max-h-[200px] min-w-(--radix-select-trigger-width)"
                    position="popper"
                    sideOffset={4}
                  >
                    {accountOptions.map((acc) => (
                      <SelectItem
                        key={acc}
                        value={acc}
                        className="rounded-lg focus:bg-purple-50 focus:text-purple-600 data-[state=checked]:bg-purple-50 data-[state=checked]:text-purple-600 data-[state=checked]:font-medium cursor-pointer py-2.5 px-3 mb-1 last:mb-0"
                      >
                        {acc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  금액
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={depositAmount}
                    onChange={(e) =>
                      setDepositAmount(formatNumber(e.target.value))
                    }
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className="text-right pr-10"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    원
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  메모
                </label>
                <Input
                  type="text"
                  value={depositMemo}
                  onChange={(e) => setDepositMemo(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="예: 월급, 보너스"
                />
              </div>
            </>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1 border-border text-muted-foreground"
          >
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 text-white ${getButtonColor()}`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "수정"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

