import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { Card, CardContent } from '@repo/design-system/components/card';
import { ExternalLink, PieChart, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData, syncPortfolio } from '../actions/dashboard';
import { checkSheetConnection } from '../actions/onboarding';
import { BottomNav } from '../dashboard/components/BottomNav';
import { OCRModal } from '../dashboard/components/OCRModal';

function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (compact && amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export default async function PortfolioPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { connected, sheetId } = await checkSheetConnection();
  if (!connected) {
    redirect('/onboarding');
  }

  const data = await getDashboardData();
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;

  const portfolio = data?.portfolio || [];
  const totalAsset = data?.totalAsset || 0;

  // 종목별 비중 계산
  const portfolioWithWeight = portfolio.map((item) => ({
    ...item,
    weight: totalAsset > 0 ? (item.totalValue / totalAsset) * 100 : 0,
  }));

  // 수익률 순으로 정렬
  const sortedPortfolio = [...portfolioWithWeight].sort(
    (a, b) => b.yieldPercent - a.yieldPercent
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">포트폴리오</span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-slate-400 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <ExternalLink size={14} />
                시트
              </Button>
            </Link>
          )}
          <form
            action={async () => {
              'use server';
              await syncPortfolio();
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
            >
              <RefreshCw size={16} />
            </Button>
          </form>
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

      <main className="p-5 space-y-6">
        {/* Summary */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-400">총 평가금액</h2>
            <span className="text-xs text-slate-500">{portfolio.length}개 종목</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {formatCurrency(totalAsset, true)}
            </span>
            <span className="text-sm text-slate-500">원</span>
          </div>
          {data && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">투자원금</span>
                <span className="text-white">{formatCurrency(data.totalInvested, true)}원</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">수익금</span>
                <span
                  className={data.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                >
                  {formatCurrency(data.totalProfit, true)}원
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Portfolio List */}
        {portfolio.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <PieChart className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">보유 종목이 없습니다</h3>
            <p className="text-sm text-slate-400 max-w-[280px]">
              시트의 '3. 종목현황' 탭에 데이터를 입력하거나
              <br />
              매매 인증을 통해 종목을 추가해보세요.
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-slate-400">보유 종목</h3>
            <div className="space-y-2">
              {sortedPortfolio.map((item) => (
                <Card
                  key={item.ticker}
                  className="bg-white/5 border-white/5 shadow-none rounded-2xl overflow-hidden"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {item.name || item.ticker}
                          </span>
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {item.ticker}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">
                            {item.quantity.toLocaleString()}주
                          </span>
                          <span className="text-xs text-slate-500">·</span>
                          <span className="text-xs text-slate-400">
                            평단 {formatCurrency(item.avgPrice)}원
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-white">
                          {formatCurrency(item.totalValue, true)}원
                        </div>
                        <div
                          className={`flex items-center justify-end gap-1 text-xs ${
                            item.yieldPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.yieldPercent >= 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {formatPercent(item.yieldPercent)}
                        </div>
                      </div>
                    </div>
                    {/* Weight bar */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">포트폴리오 비중</span>
                        <span className="text-slate-400">{item.weight.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(item.weight, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <OCRModal />
      <BottomNav />
    </div>
  );
}
