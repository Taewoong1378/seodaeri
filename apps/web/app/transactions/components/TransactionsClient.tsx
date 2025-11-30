'use client';

import { Card, CardContent } from '@repo/design-system/components/card';
import { cn } from '@repo/design-system/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Banknote, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';

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
}

interface TransactionsClientProps {
  transactions: Transaction[];
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

export function TransactionsClient({ transactions }: TransactionsClientProps) {
  const [activeTab, setActiveTab] = useState<'dividend' | 'trade'>('dividend');

  // 배당내역: DIVIDEND
  const dividendTransactions = transactions.filter((tx) => tx.type === 'DIVIDEND');

  // 거래내역: BUY, SELL, DEPOSIT, WITHDRAW
  const tradeTransactions = transactions.filter(
    (tx) => tx.type === 'BUY' || tx.type === 'SELL' || tx.type === 'DEPOSIT' || tx.type === 'WITHDRAW'
  );

  const currentTransactions = activeTab === 'dividend' ? dividendTransactions : tradeTransactions;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab('dividend')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'dividend'
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Banknote size={16} />
          배당내역
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            activeTab === 'dividend' ? "bg-white/20" : "bg-white/10"
          )}>
            {dividendTransactions.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trade')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            activeTab === 'trade'
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <ArrowUpRight size={16} />
          거래내역
          <span className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            activeTab === 'trade' ? "bg-white/20" : "bg-white/10"
          )}>
            {tradeTransactions.length}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {currentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              {activeTab === 'dividend' ? (
                <Banknote className="w-8 h-8 text-slate-500" />
              ) : (
                <TrendingUp className="w-8 h-8 text-slate-500" />
              )}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              {activeTab === 'dividend' ? '배당내역이 없습니다' : '거래내역이 없습니다'}
            </h3>
            <p className="text-sm text-slate-400 max-w-[280px]">
              {activeTab === 'dividend'
                ? "시트의 '7. 배당내역' 탭에 데이터를 입력해보세요."
                : "카메라 버튼을 눌러 매매 내역을 촬영하고 거래를 기록해보세요."}
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
                  <div className="flex items-start justify-between">
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
                      <div className="flex flex-col gap-1">
                        <span className="text-base font-bold text-white leading-tight">
                          {tx.name || (tx.type === 'DEPOSIT' ? '현금 입금' : tx.type === 'WITHDRAW' ? '현금 출금' : tx.ticker)}
                        </span>
                        <div className="flex items-center gap-2">
                          {tx.ticker ? (
                            <span className="text-xs font-medium text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                              {tx.ticker}
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                              현금
                            </span>
                          )}
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-500">
                            {formatDate(tx.trade_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
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
                            {tx.type === 'BUY'
                              ? '매수'
                              : tx.type === 'SELL'
                              ? '매도'
                              : tx.type === 'DIVIDEND'
                              ? '배당'
                              : tx.type === 'DEPOSIT'
                              ? '입금'
                              : tx.type === 'WITHDRAW'
                              ? '출금'
                              : tx.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
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
  );
}
