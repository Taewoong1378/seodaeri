import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { Card, CardContent } from '@repo/design-system/components/card';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { checkSheetConnection } from '../actions/onboarding';
import { getTransactions } from '../actions/transactions';
import { BottomNav } from '../dashboard/components/BottomNav';
import { OCRModal } from '../dashboard/components/OCRModal';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default async function TransactionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { connected, sheetId } = await checkSheetConnection();
  if (!connected) {
    redirect('/onboarding');
  }

  const { transactions, error } = await getTransactions();
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0` : null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">거래내역</span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-slate-400 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <ExternalLink size={14} />
                시트 열기
              </Button>
            </Link>
          )}
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || '프로필'}
              width={32}
              height={32}
              className="rounded-full border border-white/10"
            />
          )}
        </div>
      </header>

      <main className="p-5 space-y-4">
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!transactions || transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              거래내역이 없습니다
            </h3>
            <p className="text-sm text-slate-400 max-w-[280px]">
              카메라 버튼을 눌러 매매 내역을 촬영하고<br />
              거래를 기록해보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card
                key={tx.id}
                className="bg-white/5 border-white/5 shadow-none rounded-2xl overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'BUY'
                            ? 'bg-emerald-500/20'
                            : tx.type === 'SELL'
                            ? 'bg-red-500/20'
                            : 'bg-blue-500/20'
                        }`}
                      >
                        {tx.type === 'BUY' ? (
                          <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                        ) : tx.type === 'SELL' ? (
                          <ArrowUpRight className="w-5 h-5 text-red-400" />
                        ) : tx.type === 'DIVIDEND' ? (
                          <TrendingUp className="w-5 h-5 text-blue-400" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {tx.name || tx.ticker}
                          </span>
                          <span className="text-xs text-slate-500">
                            {tx.ticker}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span
                            className={
                              tx.type === 'BUY'
                                ? 'text-emerald-400'
                                : tx.type === 'SELL'
                                ? 'text-red-400'
                                : ''
                            }
                          >
                            {tx.type === 'BUY'
                              ? '매수'
                              : tx.type === 'SELL'
                              ? '매도'
                              : tx.type === 'DIVIDEND'
                              ? '배당'
                              : tx.type}
                          </span>
                          <span>·</span>
                          <span>{formatDate(tx.trade_date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          tx.type === 'BUY'
                            ? 'text-emerald-400'
                            : tx.type === 'SELL'
                            ? 'text-red-400'
                            : 'text-white'
                        }`}
                      >
                        {tx.type === 'BUY' ? '-' : '+'}
                        {formatCurrency(tx.total_amount)}원
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatCurrency(tx.price)}원 × {tx.quantity}주
                      </div>
                    </div>
                  </div>
                  {!tx.sheet_synced && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs text-amber-400">
                        시트 동기화 대기 중
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <OCRModal />
      <BottomNav />
    </div>
  );
}
