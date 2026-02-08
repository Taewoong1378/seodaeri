"use client";

import { Card, CardContent } from "@repo/design-system/components/card";
import { BarChart3, Coins } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDashboard, useGoalSettings } from "../../../hooks";
import { getSmallBanners } from "../../../lib/banner-data";
import { AccountTrendChart } from "./AccountTrendChart";
import { BannerCarousel } from "./BannerCarousel";
import { CumulativeDividendChart } from "./CumulativeDividendChart";
import { DashboardTabs } from "./DashboardTabs";
import { DividendByYearChart } from "./DividendByYearChart";
import { DividendChart } from "./DividendChart";
import { HeroCard } from "./HeroCard";
import { MajorIndexYieldComparisonChart } from "./MajorIndexYieldComparisonChart";
import { MonthlyProfitLossChart } from "./MonthlyProfitLossChart";
import { MonthlyYieldComparisonChart } from "./MonthlyYieldComparisonChart";
import { MonthlyYieldComparisonDollarAppliedChart } from "./MonthlyYieldComparisonDollarAppliedChart";
import { PerformanceComparisonChart } from "./PerformanceComparisonChart";
import { PortfolioDonutChart } from "./PortfolioDonutChart";
import { PortfolioHoldingsChart } from "./PortfolioHoldingsChart";
import { RollingAverageDividendChart } from "./RollingAverageDividendChart";
import { SmallBanner } from "./SmallBanner";
import { YearlyDividendChart } from "./YearlyDividendChart";
import { YieldComparisonChart } from "./YieldComparisonChart";
import { GoalSettingModal } from "./GoalSettingModal";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount));
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Hero Section Skeleton */}
      <section>
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary/20 to-primary/5 border border-border p-6 md:p-8 animate-pulse">
          <div className="flex flex-col gap-1 mb-6">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-10 w-48 bg-muted rounded mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
            <div>
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* Account Trend Chart Skeleton */}
      <section>
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6 animate-pulse">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="h-[200px] w-full bg-muted rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </section>

      {/* Performance Comparison Chart Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1 animate-pulse">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="h-[200px] w-full bg-muted rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </section>

      {/* Portfolio Charts Skeleton */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1 animate-pulse">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>

        {/* Donut Chart Skeleton */}
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-4 animate-pulse">
              <div className="h-48 w-48 rounded-full bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-muted" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Holdings Chart Skeleton */}
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-12 bg-muted rounded" />
            </div>
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <div className="h-3 w-20 bg-muted rounded" />
                      <div className="h-2 w-12 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Stats Summary Skeleton */}
      <section>
        <div className="grid grid-cols-2 gap-4 animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-[20px] p-5 backdrop-blur-sm"
            >
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-6 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Dividend Chart Skeleton */}
      <section>
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="h-[200px] w-full bg-muted rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export function DashboardContent() {
  const { data: session } = useSession();
  const { data, isPending, error } = useDashboard();
  const { data: goalSettings } = useGoalSettings();
  const [goalModalType, setGoalModalType] = useState<'yearly' | 'monthly'>('yearly');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // 데모 모드에서는 배너 숨김 (Play Store 심사용)
  const smallBanners = useMemo(() => {
    if (session?.isDemo) return [];
    return getSmallBanners();
  }, [session?.isDemo]);

  // 로딩 중이거나 데이터가 아직 없으면 스켈레톤 표시
  // data가 있으면 바로 컨텐츠를 보여줌 (백그라운드 refetch 중에도)
  if (isPending || !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">
          데이터를 불러오는 중 오류가 발생했습니다.
        </p>
        <p className="text-sm text-slate-500 mt-2">{error.message}</p>
      </div>
    );
  }

  const displayData = data;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* 배너 캐러셀 */}
        <BannerCarousel />
        {displayData.totalAsset > 0 && (() => {
          // 이번달 손익 계산
          const currentMonth = new Date().getMonth() + 1; // 1-12
          const thisMonthData = displayData.monthlyProfitLoss.find(
            (m) => m.month === `${currentMonth}월`
          );
          const thisMonthProfit = thisMonthData
            ? thisMonthData.profit - thisMonthData.loss
            : undefined;
          const thisMonthYield = thisMonthProfit !== undefined && displayData.totalInvested > 0
            ? (thisMonthProfit / displayData.totalInvested) * 100
            : undefined;

          // 올해 손익 계산 (모든 월 합산)
          const thisYearProfit = displayData.monthlyProfitLoss.length > 0
            ? displayData.monthlyProfitLoss.reduce(
                (sum, m) => sum + m.profit - m.loss, 0
              )
            : undefined;
          const thisYearYield = thisYearProfit !== undefined && displayData.totalInvested > 0
            ? (thisYearProfit / displayData.totalInvested) * 100
            : undefined;

          return (
            <HeroCard
              totalAsset={displayData.totalAsset}
              totalInvested={displayData.totalInvested}
              totalProfit={displayData.totalProfit}
              totalYield={displayData.totalYield}
              thisMonthProfit={thisMonthProfit}
              thisMonthYield={thisMonthYield}
              thisYearProfit={thisYearProfit}
              thisYearYield={thisYearYield}
              investmentDays={displayData.investmentDays}
              yearlyGoal={goalSettings?.yearlyGoal}
              monthlyGoal={goalSettings?.monthlyGoal}
              onEditYearlyGoal={() => { setGoalModalType('yearly'); setIsGoalModalOpen(true); }}
              onEditMonthlyGoal={() => { setGoalModalType('monthly'); setIsGoalModalOpen(true); }}
            />
          );
        })()}
      </section>

      {/* Tabbed Content */}
      <DashboardTabs>
        {{
          /* 탭 1: 계좌현황(누적) */
          cumulative: (() => {
            // 누적 탭에 표시할 데이터가 있는지 확인
            const hasCumulativeData =
              displayData.accountTrend.length > 0 ||
              displayData.performanceComparison.length > 0 ||
              displayData.yieldComparison ||
              displayData.yieldComparisonDollar ||
              displayData.portfolio.length > 0;

            return (
            <div className="space-y-6">
              {/* 빈 상태 안내 (아무 데이터도 없을 때만 표시) */}
              {!hasCumulativeData && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <BarChart3 className="w-7 h-7 text-primary" />
                      </div>
                      <p className="text-base font-semibold text-foreground mb-2">
                        아직 계좌 데이터가 없어요
                      </p>
                      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
                        내역 페이지에서 계좌총액, 배당금, 입출금 내역을
                        기록해보세요
                      </p>
                      <Link href="/transactions">
                        <button
                          type="button"
                          className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:bg-primary/90 transition-colors"
                        >
                          내역 기록하러 가기
                        </button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Trend Chart (누적입금액 vs 계좌총액) */}
              {displayData.accountTrend.length > 0 && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
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
                    <h3 className="text-base font-bold text-foreground">
                      누적 수익률
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      vs 주요 지수
                    </span>
                  </div>
                  <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                    <CardContent className="p-6">
                      <PerformanceComparisonChart
                        data={displayData.performanceComparison}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Small Banner 1 - 데이터 유무와 관계없이 표시 */}
              {smallBanners[0] && (
                <SmallBanner
                  title={smallBanners[0].title}
                  description={smallBanners[0].description}
                  image={smallBanners[0].image}
                  link={smallBanners[0].link}
                  gradient={smallBanners[0].gradient}
                />
              )}

              {/* Yield Comparison Bar Chart (원화 + 달러환율 통합) */}
              {displayData.yieldComparison && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <YieldComparisonChart
                      data={displayData.yieldComparison}
                      dollarData={displayData.yieldComparisonDollar}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Small Banner 2 - 데이터가 있을 때만 표시 (배너 연속 방지) */}
              {smallBanners[1] && displayData.accountTrend.length > 0 && (
                <SmallBanner
                  title={smallBanners[1].title}
                  description={smallBanners[1].description}
                  image={smallBanners[1].image}
                  link={smallBanners[1].link}
                  gradient={smallBanners[1].gradient}
                />
              )}

              {/* Portfolio Charts */}
              {displayData.portfolio.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-base font-bold text-foreground">
                      포트폴리오
                    </h3>
                    <Link href="/portfolio">
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        전체보기
                      </button>
                    </Link>
                  </div>

                  {/* Donut Chart Card */}
                  <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                    <CardContent className="p-6">
                      <PortfolioDonutChart
                        data={displayData.portfolio}
                        totalAsset={displayData.totalAsset}
                      />
                    </CardContent>
                  </Card>

                  {/* Holdings Chart Card */}
                  <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-foreground">
                          상위 보유 종목
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {displayData.portfolio.length}개 종목
                        </span>
                      </div>
                      <PortfolioHoldingsChart data={displayData.portfolio} />
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
            );
          })(),

          /* 탭 2: 계좌현황(올해) */
          yearly: (
            <div className="space-y-6">
              {/* Monthly Yield Comparison Chart (월, 누적 수익률 현황) */}
              {displayData.monthlyYieldComparison && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <MonthlyYieldComparisonChart
                      data={displayData.monthlyYieldComparison}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Monthly Yield Comparison Dollar Applied Chart (환율 반영) */}
              {displayData.monthlyYieldComparisonDollarApplied && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <MonthlyYieldComparisonDollarAppliedChart
                      data={displayData.monthlyYieldComparisonDollarApplied}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Major Index Yield Comparison Line Chart (주요지수 수익률 비교) */}
              {displayData.majorIndexYieldComparison && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <MajorIndexYieldComparisonChart
                      data={displayData.majorIndexYieldComparison}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Monthly Profit/Loss Chart (월별 손익) */}
              {displayData.monthlyProfitLoss.length > 0 ? (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <MonthlyProfitLossChart
                      data={displayData.monthlyProfitLoss}
                    />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <BarChart3 className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">
                        올해 손익 데이터가 없습니다
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-1.5">
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
                <div className="bg-card border border-border rounded-[20px] p-5 shadow-sm">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    이번 달 배당금
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground tracking-tight">
                      {formatCurrency(displayData.thisMonthDividend)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      원
                    </span>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-[20px] p-5 shadow-sm">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    올해 총 배당금
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground tracking-tight">
                      {formatCurrency(displayData.yearlyDividend)}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      원
                    </span>
                  </div>
                </div>
              </div>

              {/* Dividend By Year Chart (월별 배당금 현황) */}
              {displayData.dividendByYear && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <DividendByYearChart data={displayData.dividendByYear} />
                  </CardContent>
                </Card>
              )}

              {/* Yearly Dividend Summary Chart (연도별 배당금 현황) */}
              {displayData.yearlyDividendSummary && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <YearlyDividendChart
                      data={displayData.yearlyDividendSummary}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Rolling Average Dividend Chart (12개월 월평균 배당금) */}
              {displayData.rollingAverageDividend && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <RollingAverageDividendChart
                      data={displayData.rollingAverageDividend}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Cumulative Dividend Chart (배당금 누적 그래프) */}
              {displayData.cumulativeDividend && (
                <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                  <CardContent className="p-6">
                    <CumulativeDividendChart
                      data={displayData.cumulativeDividend}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Dividend Chart Section */}
              <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
                <CardContent className="pt-6 pb-6 px-6">
                  {displayData.monthlyDividends.length > 0 ? (
                    <DividendChart data={displayData.monthlyDividends} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Coins className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">
                        배당금 내역이 없습니다
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-1.5">
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

      {/* Goal Setting Modal */}
      <GoalSettingModal
        open={isGoalModalOpen}
        onOpenChange={setIsGoalModalOpen}
        type={goalModalType}
        currentGoal={goalModalType === 'yearly' ? goalSettings?.yearlyGoal : goalSettings?.monthlyGoal}
      />
    </div>
  );
}
