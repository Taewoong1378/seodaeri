'use client';

import { Card, CardContent } from '@repo/design-system/components/card';
import Link from 'next/link';
import { useDashboard, defaultDashboardData } from '../../../hooks';
import { AccountTrendChart } from './AccountTrendChart';
import { DashboardTabs } from './DashboardTabs';
import { DividendChart } from './DividendChart';
import { HeroCard } from './HeroCard';
import { MonthlyProfitLossChart } from './MonthlyProfitLossChart';
import { PerformanceComparisonChart } from './PerformanceComparisonChart';
import { PortfolioDonutChart } from './PortfolioDonutChart';
import { PortfolioHoldingsChart } from './PortfolioHoldingsChart';
import { YieldComparisonChart } from './YieldComparisonChart';
import { YieldComparisonDollarChart } from './YieldComparisonDollarChart';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-40 bg-white/5 rounded-[24px]" />
      {/* Tabs Skeleton */}
      <div className="h-12 bg-white/5 rounded-full" />
      {/* Content Skeleton */}
      <div className="space-y-4">
        <div className="h-64 bg-white/5 rounded-[24px]" />
        <div className="h-48 bg-white/5 rounded-[24px]" />
      </div>
    </div>
  );
}

export function DashboardContent() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">데이터를 불러오는 중 오류가 발생했습니다.</p>
        <p className="text-sm text-slate-500 mt-2">{error.message}</p>
      </div>
    );
  }

  const displayData = data || defaultDashboardData;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <HeroCard
          totalAsset={displayData.totalAsset}
          totalYield={displayData.totalYield}
        />
      </section>

      {/* Tabbed Content */}
      <DashboardTabs>
        {{
          /* 탭 1: 계좌현황(누적) */
          cumulative: (
            <div className="space-y-6">
              {/* Account Trend Chart (누적입금액 vs 계좌총액) */}
              {displayData.accountTrend.length > 0 && (
                <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <AccountTrendChart
                      data={displayData.accountTrend}
                      currentTotalAsset={displayData.totalAsset}
                      currentTotalInvested={displayData.totalInvested}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Performance Comparison Line Chart */}
              {displayData.performanceComparison.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-base font-bold text-white">누적 수익률</h3>
                    <span className="text-xs text-slate-500">vs 주요 지수</span>
                  </div>
                  <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                    <CardContent className="p-6">
                      <PerformanceComparisonChart data={displayData.performanceComparison} />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Yield Comparison Bar Chart */}
              {displayData.yieldComparison && (
                <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <YieldComparisonChart data={displayData.yieldComparison} />
                  </CardContent>
                </Card>
              )}

              {/* Yield Comparison Dollar Bar Chart (달러환율 적용) */}
              {displayData.yieldComparisonDollar && (
                <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <YieldComparisonDollarChart data={displayData.yieldComparisonDollar} />
                  </CardContent>
                </Card>
              )}

              {/* Portfolio Charts */}
              {displayData.portfolio.length > 0 && (
                <div className="space-y-4">
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
                </div>
              )}
            </div>
          ),

          /* 탭 2: 계좌현황(올해) */
          yearly: (
            <div className="space-y-6">
              {/* Monthly Profit/Loss Chart (월별 손익) */}
              {displayData.monthlyProfitLoss.length > 0 ? (
                <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <MonthlyProfitLossChart data={displayData.monthlyProfitLoss} />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        올해 손익 데이터가 없습니다
                      </p>
                      <p className="text-xs text-slate-600 mt-1.5">
                        시트에 데이터가 입력되면 자동으로 표시됩니다
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ),

          /* 탭 3: 배당현황 */
          dividend: (
            <div className="space-y-6">
              {/* Quick Stats Summary */}
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

              {/* Dividend Chart Section */}
              <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
                <CardContent className="pt-6 pb-6 px-6">
                  {displayData.monthlyDividends.length > 0 ? (
                    <DividendChart data={displayData.monthlyDividends} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <span className="text-2xl">💰</span>
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
            </div>
          ),
        }}
      </DashboardTabs>
    </div>
  );
}
