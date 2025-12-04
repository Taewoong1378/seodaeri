'use client';

import { SmallBanner } from '@/app/dashboard/components/SmallBanner';
import { Card, CardContent } from '@repo/design-system/components/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@repo/design-system/components/tooltip';
import { cn } from '@repo/design-system/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Banknote, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteDeposit } from '../../actions/deposit';
import { deleteDividend } from '../../actions/dividend';
import { deleteTransaction } from '../../actions/trade';

export type TabType = 'trade' | 'dividend' | 'deposit';

// 클릭/터치로 열리는 Tooltip 컴포넌트
function ClickableTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span
          className="text-base font-bold text-white leading-none truncate cursor-pointer block max-w-[160px]"
          onClick={() => setOpen(!open)}
          onTouchStart={() => setOpen(true)}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-slate-800 text-white border-slate-700 max-w-[280px] z-[100]"
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
  type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW';
  price: number;
  quantity: number;
  total_amount: number;
  trade_date: string;
  sheet_synced: boolean;
  created_at: string;
  source: 'app' | 'sheet';
  account?: string; // 계좌(증권사) 정보
}

interface TransactionsClientProps {
  transactions: Transaction[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function TransactionsClient({ transactions, activeTab, onTabChange }: TransactionsClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (tx: Transaction) => {
    const typeText = tx.type === 'BUY' ? '매수' :
                     tx.type === 'SELL' ? '매도' :
                     tx.type === 'DIVIDEND' ? '배당' :
                     tx.type === 'DEPOSIT' ? '입금' : '출금';

    if (!confirm(`이 ${typeText} 내역을 삭제하시겠습니까?`)) {
      return;
    }

    setDeletingId(tx.id);

    try {
      let result;

      if (tx.type === 'DIVIDEND') {
        result = await deleteDividend({
          date: tx.trade_date.split('T')[0] || tx.trade_date,
          ticker: tx.ticker,
          amountKRW: tx.total_amount,
          amountUSD: 0,
        });
      } else if (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW') {
        result = await deleteDeposit({
          date: tx.trade_date.split('T')[0] || tx.trade_date,
          type: tx.type,
          amount: tx.total_amount,
        });
      } else {
        result = await deleteTransaction({
          id: tx.source === 'app' ? tx.id : undefined,
          date: tx.trade_date.split('T')[0] || tx.trade_date,
          ticker: tx.ticker,
          type: tx.type,
          price: tx.price,
          quantity: tx.quantity,
        });
      }

      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  // 거래내역: BUY, SELL (매수/매도만)
  const tradeTransactions = transactions.filter(
    (tx) => tx.type === 'BUY' || tx.type === 'SELL'
  );

  // 배당내역: DIVIDEND
  const dividendTransactions = transactions.filter((tx) => tx.type === 'DIVIDEND');

  // 입금내역: DEPOSIT, WITHDRAW
  const depositTransactions = transactions.filter(
    (tx) => tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW'
  );

  const currentTransactions =
    activeTab === 'dividend' ? dividendTransactions :
    activeTab === 'deposit' ? depositTransactions :
    tradeTransactions;

  // 총 배당금 계산
  const totalDividend = dividendTransactions.reduce((sum, tx) => sum + tx.total_amount, 0);

  // 올해 배당금 계산
  const currentYear = new Date().getFullYear();
  const thisYearDividend = dividendTransactions
    .filter((tx) => new Date(tx.trade_date).getFullYear() === currentYear)
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 총 입금액 계산
  const totalDeposit = depositTransactions
    .filter((tx) => tx.type === 'DEPOSIT')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 총 출금액 계산
  const totalWithdraw = depositTransactions
    .filter((tx) => tx.type === 'WITHDRAW')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 총 매수금액 계산
  const totalBuy = tradeTransactions
    .filter((tx) => tx.type === 'BUY')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  // 총 매도금액 계산
  const totalSell = tradeTransactions
    .filter((tx) => tx.type === 'SELL')
    .reduce((sum, tx) => sum + tx.total_amount, 0);

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Tabs - 3 tabs */}
      <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => onTabChange('trade')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'trade'
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <ArrowUpRight size={14} />
          거래
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            activeTab === 'trade' ? "bg-white/20" : "bg-white/10"
          )}>
            {tradeTransactions.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('dividend')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'dividend'
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Banknote size={14} />
          배당
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            activeTab === 'dividend' ? "bg-white/20" : "bg-white/10"
          )}>
            {dividendTransactions.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('deposit')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'deposit'
              ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Wallet size={14} />
          입출금
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            activeTab === 'deposit' ? "bg-white/20" : "bg-white/10"
          )}>
            {depositTransactions.length}
          </span>
        </button>
      </div>

      {/* Summary - per tab */}
      {activeTab === 'trade' && tradeTransactions.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 rounded-2xl p-5 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-300/70 mb-1">총 매수금액</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBuy)}원</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-300/70 mb-1">총 매도금액</p>
              <p className="text-lg font-semibold text-red-400">{formatCurrency(totalSell)}원</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dividend' && dividendTransactions.length > 0 && (
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/10 rounded-2xl p-5 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-300/70 mb-1">누적 배당금</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalDividend)}원</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-300/70 mb-1">올해 배당금</p>
              <p className="text-lg font-semibold text-blue-400">{formatCurrency(thisYearDividend)}원</p>
            </div>
          </div>
        </div>
      )}

      {/* SCHD Banner for Dividend Tab */}
      {activeTab === 'dividend' && (
        <SmallBanner
          title="SOL 미국배당다우존스"
          description="한국판 SCHD로 시작하는 월배당 투자"
          image="/images/banners/banner-sol-etf.png"
          link="https://www.shinhansec.com"
          gradient="from-blue-600 to-indigo-900"
        />
      )}

      {activeTab === 'deposit' && depositTransactions.length > 0 && (
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/10 rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-300/70 mb-1">총 입금액</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalDeposit)}원</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-300/70 mb-1">총 출금액</p>
              <p className="text-lg font-semibold text-orange-400">{formatCurrency(totalWithdraw)}원</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {currentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              {activeTab === 'dividend' ? (
                <Banknote className="w-8 h-8 text-slate-500" />
              ) : activeTab === 'deposit' ? (
                <Wallet className="w-8 h-8 text-slate-500" />
              ) : (
                <TrendingUp className="w-8 h-8 text-slate-500" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {activeTab === 'dividend' ? '배당내역이 없습니다' :
               activeTab === 'deposit' ? '입출금내역이 없습니다' : '거래내역이 없습니다'}
            </h3>
            <p className="text-sm text-slate-400 max-w-[280px]">
              {activeTab === 'dividend'
                ? "펜 버튼을 눌러 배당내역을 입력해보세요."
                : activeTab === 'deposit'
                ? "펜 버튼을 눌러 입출금내역을 입력해보세요."
                : "펜 버튼을 눌러 매매 내역을 촬영하고 거래를 기록해보세요."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentTransactions.map((tx) => (
              <Card
                key={tx.id}
                className="bg-white/5 border-white/5 shadow-none rounded-2xl overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                          tx.type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : tx.type === 'SELL'
                            ? 'bg-red-500/10 text-red-400'
                            : tx.type === 'DIVIDEND'
                            ? 'bg-blue-500/10 text-blue-400'
                            : tx.type === 'DEPOSIT'
                            ? 'bg-purple-500/10 text-purple-400'
                            : tx.type === 'WITHDRAW'
                            ? 'bg-orange-500/10 text-orange-400'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {tx.type === 'BUY' ? (
                          <ArrowDownLeft className="w-6 h-6" />
                        ) : tx.type === 'SELL' ? (
                          <ArrowUpRight className="w-6 h-6" />
                        ) : tx.type === 'DIVIDEND' ? (
                          <Banknote className="w-6 h-6" />
                        ) : tx.type === 'DEPOSIT' ? (
                          <Wallet className="w-6 h-6" />
                        ) : tx.type === 'WITHDRAW' ? (
                          <TrendingDown className="w-6 h-6" />
                        ) : (
                          <TrendingUp className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <ClickableTooltip
                          text={
                            (tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW')
                              ? (tx.account || (tx.type === 'DEPOSIT' ? '입금' : '출금'))
                              : (tx.name || tx.ticker)
                          }
                        />
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {tx.ticker && (
                            <>
                              <span className="font-medium text-slate-400">{tx.ticker}</span>
                              <span className="text-slate-600">·</span>
                            </>
                          )}
                          {/* 입출금의 경우 메모 표시 */}
                          {(tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW') && tx.name && (
                            <>
                              <span className="font-medium text-slate-400">{tx.name}</span>
                              <span className="text-slate-600">·</span>
                            </>
                          )}
                          <span className="whitespace-nowrap">{formatDate(tx.trade_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="text-right flex flex-col items-end gap-1 whitespace-nowrap">
                        <div
                          className={`text-lg font-bold tracking-tight ${
                            tx.type === 'BUY'
                              ? 'text-emerald-400'
                              : tx.type === 'SELL'
                              ? 'text-red-400'
                              : tx.type === 'DIVIDEND'
                              ? 'text-blue-400'
                              : tx.type === 'DEPOSIT'
                              ? 'text-purple-400'
                              : tx.type === 'WITHDRAW'
                              ? 'text-orange-400'
                              : 'text-white'
                          }`}
                        >
                          {tx.type === 'BUY' || tx.type === 'WITHDRAW' ? '-' : '+'}
                          {formatCurrency(tx.total_amount)}원
                        </div>
                        {tx.type === 'BUY' || tx.type === 'SELL' ? (
                          <div className="text-xs font-medium text-slate-500">
                            {formatCurrency(tx.price)}원 × {tx.quantity}주
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(tx)}
                        disabled={deletingId === tx.id}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                        aria-label="삭제"
                      >
                        <Trash2 size={16} className={deletingId === tx.id ? 'animate-pulse' : ''} />
                      </button>
                    </div>
                  </div>
                  {!tx.sheet_synced && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                      <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
                        시트 동기화 대기 중
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
    </TooltipProvider>
  );
}
