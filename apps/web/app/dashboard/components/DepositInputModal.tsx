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
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  Loader2,
  Pen,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAccountList, useSaveDeposit } from "../../../hooks";
import type { DepositInput } from "../../actions/deposit";

type InputMode = "select" | "single" | "recurring";

// 기본 계좌 목록
const DEFAULT_ACCOUNTS = [
  "일반계좌1",
  "일반계좌2",
  "개인연금1",
  "개인연금2",
  "IRP 1",
  "IRP 2",
  "ISA",
  "퇴직연금DC",
];

export function DepositInputModal() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<InputMode>("select");
  const [isWithdraw, setIsWithdraw] = useState(false);

  // TanStack Query hooks
  const { mutate: saveDeposit, isPending: isSaving } = useSaveDeposit();
  const { data: accountList, isLoading: isLoadingAccounts } = useAccountList();

  const accounts =
    accountList && accountList.length > 0 ? accountList : DEFAULT_ACCOUNTS;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 단일 입금 폼
  const [form, setForm] = useState<DepositInput>({
    date: new Date().toISOString().split("T")[0] || "",
    amount: 0,
    memo: "",
    type: "DEPOSIT",
    account: "일반계좌1",
  });

  // 자동 입금 설정
  const [recurringForm, setRecurringForm] = useState({
    amount: 0,
    dayOfMonth: 1,
    memo: "월 정기 입금",
    enabled: true,
    account: "일반계좌1",
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      resetState();
    }
  };

  const resetState = () => {
    setMode("select");
    setIsWithdraw(false);
    setForm({
      date: new Date().toISOString().split("T")[0] || "",
      amount: 0,
      memo: "",
      type: "DEPOSIT",
      account: accounts[0] || "일반계좌1",
    });
    setFormattedAmount("");
    setFormattedRecurringAmount("");
  };

  const handleSave = () => {
    if (form.amount <= 0) {
      toast.error("금액을 입력해주세요.");
      return;
    }

    saveDeposit(
      {
        ...form,
        type: isWithdraw ? "WITHDRAW" : "DEPOSIT",
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast.success(
              isWithdraw
                ? "출금내역이 저장되었습니다."
                : "입금내역이 저장되었습니다."
            );
            handleOpenChange(false);
          } else {
            toast.error(result.error || "저장에 실패했습니다.");
          }
        },
        onError: (error) => {
          console.error("Save error:", error);
          toast.error("저장 중 오류가 발생했습니다.");
        },
      }
    );
  };

  const handleSaveRecurring = () => {
    if (recurringForm.amount <= 0) {
      toast.error("금액을 입력해주세요.");
      return;
    }

    // 현재 날짜 기준으로 이번 달 입금 생성
    const today = new Date();
    const targetDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      recurringForm.dayOfMonth
    );

    // 오늘 이전이면 입금 생성
    if (targetDate <= today) {
      saveDeposit(
        {
          date: targetDate.toISOString().split("T")[0] || "",
          amount: recurringForm.amount,
          memo: recurringForm.memo,
          type: "DEPOSIT",
          account: recurringForm.account,
        },
        {
          onSuccess: (result) => {
            if (result.success) {
              toast.success(
                "입금내역이 저장되었습니다. 매월 자동 입금을 사용하시려면 설정에서 추가로 설정해주세요."
              );
              handleOpenChange(false);
            } else {
              toast.error(result.error || "저장에 실패했습니다.");
            }
          },
          onError: (error) => {
            console.error("Save error:", error);
            toast.error("저장 중 오류가 발생했습니다.");
          },
        }
      );
    } else {
      toast.error("선택한 날짜가 아직 도래하지 않았습니다.");
    }
  };

  const updateField = (field: keyof DepositInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  // 금액 포맷된 문자열 상태
  const [formattedAmount, setFormattedAmount] = useState<string>("");
  const [formattedRecurringAmount, setFormattedRecurringAmount] =
    useState<string>("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatNumberWithComma(e.target.value);
    setFormattedAmount(formatted);
    updateField("amount", parseFormattedNumber(formatted));
  };

  const handleRecurringAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const formatted = formatNumberWithComma(e.target.value);
    setFormattedRecurringAmount(formatted);
    setRecurringForm((prev) => ({
      ...prev,
      amount: parseFormattedNumber(formatted),
    }));
  };

  const handleInputFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  return (
    <>
      {/* Floating Action Button - Purple for deposits */}
      {mounted &&
        createPortal(
          <div className="fixed bottom-24 left-0 right-0 z-50 max-w-[500px] mx-auto pointer-events-none">
            <Button
              size="icon"
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 active:scale-95 text-primary-foreground absolute right-5 bottom-0 pointer-events-auto animate-in zoom-in duration-300 transition-all"
            >
              <Pen size={24} />
            </Button>
          </div>,
          document.body
        )}

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-[425px] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-card border-0 shadow-xl"
          style={{
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "min(425px, calc(100vw - 2rem))",
          }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 z-10">
            <DialogHeader className="p-0 space-y-0">
              <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
                입출금 내역 추가
              </DialogTitle>
            </DialogHeader>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <X size={18} />
              </Button>
            </DialogClose>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* Mode Selection */}
            {mode === "select" && (
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground text-center mb-8">
                  입력 방식을 선택하세요
                </p>
                <Button
                  className="w-full h-20 bg-muted hover:bg-muted/80 text-foreground flex flex-col gap-2 rounded-xl transition-all"
                  variant="ghost"
                  onClick={() => setMode("single")}
                >
                  <Calendar size={18} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">단일 입금/출금</span>
                </Button>
                <Button
                  className="w-full h-20 bg-muted hover:bg-muted/80 text-foreground flex flex-col gap-2 rounded-xl transition-all"
                  variant="ghost"
                  onClick={() => setMode("recurring")}
                >
                  <RefreshCw size={18} className="text-muted-foreground" />
                  <span className="font-semibold text-sm">정기 입금 (매월)</span>
                </Button>
              </div>
            )}

            {/* Single Deposit Form */}
            {mode === "single" && (
              <div className="space-y-6">
                {/* 입금/출금 선택 */}
                <div className="p-1 bg-muted rounded-xl flex gap-1">
                  <Button
                    variant="ghost"
                    className={`flex-1 h-10 rounded-lg font-medium transition-all ${
                      !isWithdraw
                        ? "bg-card text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setIsWithdraw(false)}
                  >
                    <ArrowDownLeft size={16} className="mr-2" />
                    입금
                  </Button>
                  <Button
                    variant="ghost"
                    className={`flex-1 h-10 rounded-lg font-medium transition-all ${
                      isWithdraw
                        ? "bg-card text-destructive shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setIsWithdraw(true)}
                  >
                    <ArrowUpRight size={16} className="mr-2" />
                    출금
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="account"
                    className="text-sm font-medium text-foreground"
                  >
                    계좌
                  </Label>
                  <Select
                    value={form.account}
                    onValueChange={(value) => updateField("account", value)}
                    disabled={isLoadingAccounts}
                  >
                    <SelectTrigger className="h-12 bg-card border-border text-foreground">
                      <SelectValue placeholder="계좌 선택" />
                    </SelectTrigger>
                    <SelectContent
                      className="bg-card border-none shadow-xl p-1 max-h-[200px] min-w-(--radix-select-trigger-width)"
                      position="popper"
                      sideOffset={4}
                    >
                      {accounts.map((account) => (
                        <SelectItem
                          key={account}
                          value={account}
                          className="rounded-lg cursor-pointer py-2.5 px-3 mb-1 last:mb-0 focus:bg-primary/10 focus:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:font-medium"
                        >
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    {isWithdraw ? "출금일" : "입금일"}
                  </Label>
                  <DatePicker
                    value={form.date}
                    onChange={(date) => updateField("date", date)}
                    placeholder={isWithdraw ? "출금일 선택" : "입금일 선택"}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-sm font-medium text-foreground"
                  >
                    금액
                  </Label>
                  <div className="relative">
                    <Input
                      id="amount"
                      type="text"
                      inputMode="numeric"
                      value={formattedAmount}
                      onChange={handleAmountChange}
                      onFocus={handleInputFocus}
                      placeholder="0"
                      className="h-12 text-right pr-8 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      원
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="memo"
                    className="text-sm font-medium text-foreground"
                  >
                    비고 (선택)
                  </Label>
                  <Input
                    id="memo"
                    value={form.memo}
                    onChange={(e) => updateField("memo", e.target.value)}
                    placeholder="예: 월급, 보너스"
                    className="h-12"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl font-medium"
                    onClick={() => setMode("select")}
                    disabled={isSaving}
                  >
                    뒤로
                  </Button>
                  <Button
                    className={`flex-1 h-12 rounded-xl font-medium transition-all ${
                      isWithdraw
                        ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                    }`}
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "저장하기"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Recurring Deposit Form */}
            {mode === "recurring" && (
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-xl">
                  <p className="text-sm text-muted-foreground text-center font-medium">
                    매월 같은 날짜에 입금 내역을 추가합니다
                  </p>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="recurringAccount"
                    className="text-sm font-medium text-foreground"
                  >
                    계좌
                  </Label>
                  <Select
                    value={recurringForm.account}
                    onValueChange={(value) =>
                      setRecurringForm((prev) => ({ ...prev, account: value }))
                    }
                    disabled={isLoadingAccounts}
                  >
                    <SelectTrigger className="h-12 bg-card border-border text-foreground">
                      <SelectValue placeholder="계좌 선택" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-none shadow-xl">
                      {accounts.map((account) => (
                        <SelectItem
                          key={account}
                          value={account}
                          className="rounded-lg cursor-pointer py-2.5 px-3 focus:bg-primary/10 focus:text-primary"
                        >
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="dayOfMonth"
                    className="text-sm font-medium text-foreground"
                  >
                    입금일 (매월)
                  </Label>
                  <div className="relative">
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min={1}
                      max={31}
                      value={recurringForm.dayOfMonth}
                      onChange={(e) =>
                        setRecurringForm((prev) => ({
                          ...prev,
                          dayOfMonth: Number(e.target.value),
                        }))
                      }
                      className="h-12 text-right pr-8 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      일
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="recurringAmount"
                    className="text-sm font-medium text-foreground"
                  >
                    입금 금액
                  </Label>
                  <div className="relative">
                    <Input
                      id="recurringAmount"
                      type="text"
                      inputMode="numeric"
                      value={formattedRecurringAmount}
                      onChange={handleRecurringAmountChange}
                      onFocus={handleInputFocus}
                      placeholder="0"
                      className="h-12 text-right pr-8 font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      원
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="recurringMemo"
                    className="text-sm font-medium text-foreground"
                  >
                    비고
                  </Label>
                  <Input
                    id="recurringMemo"
                    value={recurringForm.memo}
                    onChange={(e) =>
                      setRecurringForm((prev) => ({
                        ...prev,
                        memo: e.target.value,
                      }))
                    }
                    placeholder="예: 월 적립금"
                    className="h-12"
                  />
                </div>

                {recurringForm.amount > 0 && (
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <p className="text-sm text-primary text-center font-medium">
                      매월 {recurringForm.dayOfMonth}일:{" "}
                      <span className="font-bold text-lg ml-1">
                        ₩{formatCurrency(recurringForm.amount)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <Button
                    variant="ghost"
                    className="flex-1 h-12 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl font-medium"
                    onClick={() => setMode("select")}
                    disabled={isSaving}
                  >
                    뒤로
                  </Button>
                  <Button
                    className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium"
                    onClick={handleSaveRecurring}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "입금 기록하기"
                    )}
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
