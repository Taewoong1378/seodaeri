import { auth } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/button';
import { Card, CardContent } from '@repo/design-system/components/card';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDashboardData } from '../actions/dashboard';
import { checkSheetConnection } from '../actions/onboarding';
import { AccountTrendChart } from './components/AccountTrendChart';
import { BottomNav } from './components/BottomNav';
import { DividendChart } from './components/DividendChart';
import { HeroCard } from './components/HeroCard';
import { PerformanceComparisonChart } from './components/PerformanceComparisonChart';
import { PortfolioDonutChart } from './components/PortfolioDonutChart';
import { PortfolioHoldingsChart } from './components/PortfolioHoldingsChart';
import { SyncButton } from './components/SyncButton';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

export default async function DashboardPage() {
  const session = await auth();

  // 로그인 체크
  if (!session?.user) {
    redirect('/login');
  }

  // 시트 연동 체크 - 연동 안 되어 있으면 온보딩으로
  const { connected, sheetId } = await checkSheetConnection();
  if (!connected) {
    redirect('/onboarding');
  }

  const data = await getDashboardData();
  const sheetUrl = sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null;

  // Fallback data if DB is empty
  const displayData = data || {
    totalAsset: 0,
    totalYield: 0,
    totalInvested: 0,
    totalProfit: 0,
    thisMonthDividend: 0,
    yearlyDividend: 0,
    monthlyDividends: [],
    portfolio: [],
    performanceComparison: [],
    accountTrend: [],
    lastSyncAt: null,
  };

  // 차트 레이블 계산 (데이터가 있으면 해당 연도, 없으면 현재 연도)
  const firstDividend = displayData.monthlyDividends[0];
  const chartYear = firstDividend?.year ?? new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-white">서대리</span>
        <div className="flex items-center gap-3">
          {sheetUrl && (
            <Link href={sheetUrl} target="_blank">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-xs text-slate-400 hover:text-white hover:bg-white/10 gap-1.5 rounded-full"
              >
                <ExternalLink size={14} />
                시트
              </Button>
            </Link>
          )}
          <SyncButton />
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name || '프로필'}
              width={32}
              height={32}
              className="rounded-full border border-white/10 ring-2 ring-white/5"
            />
          )}
        </div>
      </header>

      <main className="p-5 space-y-8">
        {/* Hero Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <HeroCard
            totalAsset={displayData.totalAsset}
            totalYield={displayData.totalYield}
          />
        </section>

        {/* Account Trend Chart (누적입금액 vs 계좌총액) */}
        {displayData.accountTrend.length > 0 && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
              <CardContent className="p-6">
                <AccountTrendChart data={displayData.accountTrend} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Performance Comparison Chart */}
        {displayData.performanceComparison.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-white">수익률 비교</h3>
              <span className="text-xs text-slate-500">vs 주요 지수</span>
            </div>
            <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
              <CardContent className="p-6">
                <PerformanceComparisonChart data={displayData.performanceComparison} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Portfolio Charts */}
        {displayData.portfolio.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-white">포트폴리오</h3>
              <Link href="/portfolio">
                <button type="button" className="text-xs font-medium text-slate-500 hover:text-white transition-colors">
                  전체보기
                </button>
              </Link>
            </div>

            {/* Donut Chart Card */}
            <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
              <CardContent className="p-6">
                <PortfolioDonutChart
                  data={displayData.portfolio}
                  totalAsset={displayData.totalAsset}
                />
              </CardContent>
            </Card>

            {/* Holdings Chart Card */}
            <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">상위 보유 종목</h4>
                  <span className="text-xs text-slate-500">{displayData.portfolio.length}개 종목</span>
                </div>
                <PortfolioHoldingsChart data={displayData.portfolio} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* Quick Stats Summary */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.03] border border-white/5 rounded-[20px] p-5 backdrop-blur-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">이번 달 배당금</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  {formatCurrency(displayData.thisMonthDividend)}
                </span>
                <span className="text-xs text-slate-500 font-medium">원</span>
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-[20px] p-5 backdrop-blur-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">올해 총 배당금</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  {formatCurrency(displayData.yearlyDividend)}
                </span>
                <span className="text-xs text-slate-500 font-medium">원</span>
              </div>
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              월별 배당금
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                {chartYear}
              </span>
            </h3>
            <button type="button" className="text-xs font-medium text-slate-500 hover:text-white transition-colors">전체보기</button>
          </div>
          <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="pt-8 pb-6 px-6">
              {displayData.monthlyDividends.length > 0 ? (
                <DividendChart data={displayData.monthlyDividends} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <span className="text-2xl">📉</span>
                  </div>
                  <p className="text-sm text-slate-400 font-medium">
                    배당금 내역이 없습니다
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5">
                    시트의 '7. 배당내역' 탭에 데이터를 입력해주세요
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>


      <BottomNav />
    </div>
  );
}
