"use client";

import { Card, CardContent } from "@repo/design-system/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/design-system/components/tooltip";
import { cn } from "@repo/design-system/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  Calendar,
  Pencil,
  PiggyBank,
  Trash2,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { queryKeys } from "../../../lib/query-client";
import {
  type AccountBalanceRecord,
  deleteAccountBalance,
} from "../../actions/account-balance";
import { deleteDeposit } from "../../actions/deposit";
import { deleteDividend } from "../../actions/dividend";
import { AlertDialog, ConfirmDialog } from "./ConfirmDialog";
import { EditTransactionModal, type EditType } from "./EditTransactionModal";

export type TabType = "balance" | "dividend" | "deposit";

// 클릭/터치로 열리는 Tooltip 컴포넌트
function ClickableTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span
          className="text-sm font-bold text-foreground leading-tight truncate cursor-pointer block"
          onClick={() => setOpen(!open)}
          onTouchStart={() => setOpen(true)}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-popover text-popover-foreground border-border max-w-[280px] z-[100]"
        onPointerDownOutside={() => setOpen(false)}
      >
        <p className="text-sm break-words">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

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
  account?: string; // 계좌(증권사) 정보
  amountKRW?: number; // 배당 전용: 원화 배당금
  amountUSD?: number; // 배당 전용: 외화 배당금
}

interface TransactionsClientProps {
  transactions: Transaction[];
  accountBalances: AccountBalanceRecord[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function TransactionsClient({
  transactions,
  accountBalances,
  activeTab,
  onTabChange,
}: TransactionsClientProps) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleteBalanceTarget, setDeleteBalanceTarget] =
    useState<AccountBalanceRecord | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "error" | "success" | "default";
  }>({
    isOpen: false,
    title: "",
    description: "",
    variant: "default",
  });

  // 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editType, setEditType] = useState<EditType>("balance");
  const [editBalanceTarget, setEditBalanceTarget] =
    useState<AccountBalanceRecord | null>(null);
  const [editTransactionTarget, setEditTransactionTarget] =
    useState<Transaction | null>(null);

  const getTypeText = (type: Transaction["type"]) => {
    switch (type) {
      case "BUY":
        return "매수";
      case "SELL":
        return "매도";
      case "DIVIDEND":
        return "배당";
      case "DEPOSIT":
        return "입금";
      case "WITHDRAW":
        return "출금";
      default:
        return "거래";
    }
  };

  const handleDeleteClick = (tx: Transaction) => {
    setDeleteTarget(tx);
    setDeleteBalanceTarget(null);
    setIsConfirmOpen(true);
  };

  const handleBalanceDeleteClick = (balance: AccountBalanceRecord) => {
    setDeleteBalanceTarget(balance);
    setDeleteTarget(null);
    setIsConfirmOpen(true);
  };

  // 수정 핸들러
  const handleEditClick = (tx: Transaction) => {
    if (tx.type === "DIVIDEND") {
      setEditType("dividend");
    } else {
      setEditType("deposit");
    }
    setEditTransactionTarget(tx);
    setEditBalanceTarget(null);
    setIsEditModalOpen(true);
  };

  const handleBalanceEditClick = (balance: AccountBalanceRecord) => {
    setEditType("balance");
    setEditBalanceTarget(balance);
    setEditTransactionTarget(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    // 계좌총액 삭제
    if (deleteBalanceTarget) {
      setDeletingId(deleteBalanceTarget.id);
      try {
        const result = await deleteAccountBalance({
          yearMonth: deleteBalanceTarget.yearMonth,
          balance: deleteBalanceTarget.balance,
        });

        setIsConfirmOpen(false);
        setDeleteBalanceTarget(null);

        if (result.success) {
          queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
          queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
        } else {
          setAlertState({
            isOpen: true,
            title: "삭제 실패",
            description: result.error || "삭제에 실패했습니다.",
            variant: "error",
          });
        }
      } catch (error) {
        setIsConfirmOpen(false);
        setDeleteBalanceTarget(null);
        setAlertState({
          isOpen: true,
          title: "오류",
          description: "삭제 중 오류가 발생했습니다.",
          variant: "error",
        });
      } finally {
        setDeletingId(null);
      }
      return;
    }

    // 거래내역 삭제
    if (!deleteTarget) return;

    const tx = deleteTarget;
    setDeletingId(tx.id);

    console.log(
      "[handleDeleteConfirm] Transaction to delete:",
      JSON.stringify(tx, null, 2)
    );

    try {
      let result: any;

      if (tx.type === "DIVIDEND") {
        const input = {
          date: tx.trade_date.split("T")[0] || tx.trade_date,
          ticker: tx.ticker,
          amountKRW: tx.amountKRW ?? tx.total_amount, // 원화 배당금 (없으면 total_amount 사용)
          amountUSD: tx.amountUSD ?? 0, // 외화 배당금
        };
        console.log(
          "[handleDeleteConfirm] Calling deleteDividend with:",
          input
        );
        try {
          result = await deleteDividend(input);
          console.log("[handleDeleteConfirm] deleteDividend returned:", result);
        } catch (e) {
          console.error("[handleDeleteConfirm] deleteDividend threw error:", e);
          throw e;
        }
      } else if (tx.type === "DEPOSIT" || tx.type === "WITHDRAW") {
        const input = {
          date: tx.trade_date.split("T")[0] || tx.trade_date,
          type: tx.type,
          amount: tx.total_amount,
        };
        console.log("[handleDeleteConfirm] Calling deleteDeposit with:", input);
        result = await deleteDeposit(input);
      }

      console.log("[handleDeleteConfirm] Result:", result);

      setIsConfirmOpen(false);
      setDeleteTarget(null);

      if (result.success) {
        // React Query 캐시 무효화로 데이터 재조회
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      } else {
        setAlertState({
          isOpen: true,
          title: "삭제 실패",
          description: result.error || "삭제에 실패했습니다.",
          variant: "error",
        });
      }
    } catch (error) {
      setIsConfirmOpen(false);
      setDeleteTarget(null);
      setAlertState({
        isOpen: true,
        title: "오류",
        description: "삭제 중 오류가 발생했습니다.",
        variant: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // 배당내역: DIVIDEND
  const dividendTransactions = transactions.filter(
    (tx) => tx.type === "DIVIDEND"
  );

  // 입금내역: DEPOSIT, WITHDRAW
  const depositTransactions = transactions.filter(
    (tx) => tx.type === "DEPOSIT" || tx.type === "WITHDRAW"
  );

  const currentTransactions =
    activeTab === "dividend"
      ? dividendTransactions
      : activeTab === "deposit"
      ? depositTransactions
      : [];

  // 총 배당금 계산
  const totalDividend = dividendTransactions.reduce(
    (sum, tx) => sum + tx.total_amount,
    0
  );

  // 올해 배당금 계산
  const currentYear = new Date().getFullYear();
  const thisYearDividend = dividendTransactions
    .filter((tx) => new Date(tx.trade_date).getFullYear() === currentYear)
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 총 입금액 계산
  const totalDeposit = depositTransactions
    .filter((tx) => tx.type === "DEPOSIT")
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 총 출금액 계산
  const totalWithdraw = depositTransactions
    .filter((tx) => tx.type === "WITHDRAW")
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 최신 계좌총액 계산
  const latestBalance =
    accountBalances.length > 0 ? accountBalances[0]?.balance || 0 : 0;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Tabs - 3 tabs (반응형: 좁은 화면에서 아이콘/숫자 숨김) */}
        <div className="flex items-center bg-muted p-1 rounded-full border border-border">
          <button
            type="button"
            onClick={() => onTabChange("balance")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              activeTab === "balance"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <PiggyBank size={14} className="hidden sm:block" />
            계좌총액
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full hidden sm:inline",
                activeTab === "balance"
                  ? "bg-white/20"
                  : "bg-muted-foreground/20"
              )}
            >
              {accountBalances.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("dividend")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              activeTab === "dividend"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Banknote size={14} className="hidden sm:block" />
            배당
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full hidden sm:inline",
                activeTab === "dividend"
                  ? "bg-white/20"
                  : "bg-muted-foreground/20"
              )}
            >
              {dividendTransactions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("deposit")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
              activeTab === "deposit"
                ? "bg-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Wallet size={14} className="hidden sm:block" />
            입출금
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded-full hidden sm:inline",
                activeTab === "deposit"
                  ? "bg-white/20"
                  : "bg-muted-foreground/20"
              )}
            >
              {depositTransactions.length}
            </span>
          </button>
        </div>

        {/* Summary - per tab */}
        {activeTab === "balance" && accountBalances.length > 0 && (
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 rounded-2xl p-5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-600/70 mb-1 font-bold">
                  최신 계좌총액
                </p>
                <p className="text-2xl font-bold text-emerald-950">
                  {formatCurrency(latestBalance)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-600/70 mb-1 font-bold">
                  기록된 개월 수
                </p>
                <p className="text-lg font-semibold text-emerald-600">
                  {accountBalances.length}개월
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "dividend" && dividendTransactions.length > 0 && (
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 rounded-2xl p-5 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600/70 mb-1 font-bold">
                  누적 배당금
                </p>
                <p className="text-2xl font-bold text-blue-950">
                  {formatCurrency(totalDividend)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600/70 mb-1 font-bold">
                  올해 배당금
                </p>
                <p className="text-lg font-semibold text-blue-400">
                  {formatCurrency(thisYearDividend)}원
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TODO: 배너 추가 */}
        {/* SCHD Banner for Dividend Tab */}
        {/* {activeTab === "dividend" && (
          <SmallBanner
            title="SOL 미국배당다우존스"
            description="한국판 SCHD로 시작하는 월배당 투자"
            image="/images/banners/banner-sol-etf.png"
            link="https://www.shinhansec.com"
            gradient="from-blue-600 to-indigo-900"
          />
        )} */}

        {activeTab === "deposit" && depositTransactions.length > 0 && (
          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 rounded-2xl p-5 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600/70 mb-1 font-bold">
                  총 입금액
                </p>
                <p className="text-2xl font-bold text-purple-950">
                  {formatCurrency(totalDeposit)}원
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-600/70 mb-1 font-bold">
                  총 출금액
                </p>
                <p className="text-lg font-semibold text-purple-950">
                  {formatCurrency(totalWithdraw)}원
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* 계좌총액 탭 */}
          {activeTab === "balance" &&
            (accountBalances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <PiggyBank className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  계좌총액 기록이 없습니다
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  펜 버튼을 눌러 월별 계좌총액을 입력해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {accountBalances.map((balance) => (
                  <Card
                    key={balance.id}
                    className="bg-card border-border shadow-sm rounded-[24px] overflow-hidden"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="relative">
                        {/* 우측 상단 버튼 */}
                        <div className="absolute top-0 right-0 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleBalanceEditClick(balance)}
                            className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
                            aria-label="수정"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBalanceDeleteClick(balance)}
                            disabled={deletingId === balance.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            aria-label="삭제"
                          >
                            <Trash2
                              size={16}
                              className={
                                deletingId === balance.id ? "animate-pulse" : ""
                              }
                            />
                          </button>
                        </div>
                        {/* 상단: 아이콘 + 날짜 + 설명 */}
                        <div className="flex items-start gap-3 pr-16">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <span className="text-sm font-bold text-foreground leading-tight">
                              {balance.displayDate}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              월말 기준 총 평가금액
                            </span>
                          </div>
                        </div>
                        {/* 하단: 금액 */}
                        <div className="mt-2 pl-[52px]">
                          <div className="text-lg font-bold tracking-tight text-emerald-600">
                            {formatCurrency(balance.balance)}원
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}

          {/* 배당/입출금 탭 */}
          {(activeTab === "dividend" || activeTab === "deposit") &&
            (currentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  {activeTab === "dividend" ? (
                    <Banknote className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <Wallet className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {activeTab === "dividend"
                    ? "배당내역이 없습니다"
                    : "입출금내역이 없습니다"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[280px]">
                  {activeTab === "dividend"
                    ? "펜 버튼을 눌러 배당내역을 입력해보세요."
                    : "펜 버튼을 눌러 입출금내역을 입력해보세요."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentTransactions.map((tx) => (
                  <Card
                    key={tx.id}
                    className="bg-card border-border shadow-sm rounded-[24px] overflow-hidden"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="relative">
                        {/* 우측 상단 버튼 */}
                        <div className="absolute top-0 right-0 flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleEditClick(tx)}
                            className={`p-1.5 rounded-lg text-muted-foreground transition-colors ${
                              tx.type === "DIVIDEND"
                                ? "hover:bg-blue-500/10 hover:text-blue-600"
                                : "hover:bg-purple-500/10 hover:text-purple-600"
                            }`}
                            aria-label="수정"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(tx)}
                            disabled={deletingId === tx.id}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            aria-label="삭제"
                          >
                            <Trash2
                              size={16}
                              className={
                                deletingId === tx.id ? "animate-pulse" : ""
                              }
                            />
                          </button>
                        </div>
                        {/* 상단: 아이콘 + 종목명 + 날짜 */}
                        <div className="flex items-start gap-3 pr-16">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                              tx.type === "DIVIDEND"
                                ? "bg-blue-500/10 text-blue-600"
                                : tx.type === "DEPOSIT"
                                ? "bg-purple-500/10 text-purple-500"
                                : tx.type === "WITHDRAW"
                                ? "bg-orange-500/10 text-orange-500"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {tx.type === "DIVIDEND" ? (
                              <Banknote className="w-5 h-5" />
                            ) : tx.type === "DEPOSIT" ? (
                              <Wallet className="w-5 h-5" />
                            ) : tx.type === "WITHDRAW" ? (
                              <TrendingDown className="w-5 h-5" />
                            ) : (
                              <Wallet className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <div className="text-foreground">
                              <ClickableTooltip
                                text={
                                  tx.type === "DEPOSIT" ||
                                  tx.type === "WITHDRAW"
                                    ? tx.account ||
                                      (tx.type === "DEPOSIT" ? "입금" : "출금")
                                    : tx.name || tx.ticker
                                }
                              />
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                              {tx.ticker && (
                                <>
                                  <span className="font-medium text-muted-foreground">
                                    {tx.ticker}
                                  </span>
                                  <span className="text-muted-foreground/50">
                                    ·
                                  </span>
                                </>
                              )}
                              {/* 입출금의 경우 메모 표시 */}
                              {(tx.type === "DEPOSIT" ||
                                tx.type === "WITHDRAW") &&
                                tx.name && (
                                  <>
                                    <span className="font-medium text-muted-foreground truncate max-w-[100px]">
                                      {tx.name}
                                    </span>
                                    <span className="text-muted-foreground/50">
                                      ·
                                    </span>
                                  </>
                                )}
                              <span className="whitespace-nowrap">
                                {formatDate(tx.trade_date)}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* 하단: 금액 */}
                        <div className="mt-2 pl-[52px]">
                          <div
                            className={`text-lg font-bold tracking-tight ${
                              tx.type === "DIVIDEND"
                                ? "text-blue-600"
                                : tx.type === "DEPOSIT"
                                ? "text-purple-500"
                                : tx.type === "WITHDRAW"
                                ? "text-orange-500"
                                : "text-foreground"
                            }`}
                          >
                            {tx.type === "WITHDRAW" ? "-" : "+"}
                            {formatCurrency(tx.total_amount)}원
                          </div>
                        </div>
                      </div>
                      {!tx.sheet_synced && (
                        <div className="mt-3 pt-3 border-t border-border flex justify-end">
                          <span className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                            시트 동기화 대기 중
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
        </div>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open) {
            setDeleteTarget(null);
            setDeleteBalanceTarget(null);
          }
        }}
        title="내역 삭제"
        description={
          deleteBalanceTarget
            ? `${deleteBalanceTarget.displayDate} 계좌총액을 삭제하시겠습니까?\n삭제된 내역은 복구할 수 없습니다.`
            : deleteTarget
            ? `이 ${getTypeText(
                deleteTarget.type
              )} 내역을 삭제하시겠습니까?\n삭제된 내역은 복구할 수 없습니다.`
            : ""
        }
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteConfirm}
        isLoading={deletingId !== null}
        variant="danger"
      />

      {/* 알림 다이얼로그 */}
      <AlertDialog
        isOpen={alertState.isOpen}
        onOpenChange={(open) =>
          setAlertState((prev) => ({ ...prev, isOpen: open }))
        }
        title={alertState.title}
        description={alertState.description}
        variant={alertState.variant}
      />

      {/* 수정 모달 */}
      <EditTransactionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditBalanceTarget(null);
          setEditTransactionTarget(null);
        }}
        editType={editType}
        balanceData={editBalanceTarget || undefined}
        transactionData={editTransactionTarget || undefined}
      />
    </TooltipProvider>
  );
}
