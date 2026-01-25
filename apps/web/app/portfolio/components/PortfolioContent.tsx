"use client";

import { useSession } from "next-auth/react";
import { useDashboard } from "../../../hooks";
import { BenefitBanner } from "./BenefitBanner";
import { PortfolioClient } from "./PortfolioClient";

function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (compact && amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return new Intl.NumberFormat("ko-KR").format(Math.round(amount));
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary skeleton */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-3 w-12 bg-muted rounded" />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="h-20 bg-muted rounded-[20px]" />
      </section>
      {/* List skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}

interface PortfolioContentProps {
  sheetUrl: string | null;
  isStandalone: boolean;
}

export function PortfolioContent({ sheetUrl, isStandalone }: PortfolioContentProps) {
  const { data: session } = useSession();
  const { data, isPending, error } = useDashboard();

  if (isPending || !data) {
    return <PortfolioSkeleton />;
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

  const portfolio = data.portfolio || [];
  const totalAsset = data.totalAsset || 0;

  // 시트의 투자비중 사용 (없으면 계산)
  const portfolioWithWeight = portfolio.map((item) => ({
    ...item,
    weight:
      item.weight > 0
        ? item.weight
        : totalAsset > 0
        ? (item.totalValue / totalAsset) * 100
        : 0,
  }));

  return (
    <>
      {/* Summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            총 평가금액
          </h2>
          <span className="text-xs text-muted-foreground">
            {portfolio.length}개 종목
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {formatCurrency(totalAsset, true)}
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            원
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm bg-card p-4 rounded-[20px] border border-border shadow-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">
              투자원금
            </span>
            <span className="text-foreground font-medium">
              {formatCurrency(data.totalInvested, true)}원
            </span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">
              수익금
            </span>
            <span
              className={`font-medium ${
                data.totalProfit >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {formatCurrency(data.totalProfit, true)}원
            </span>
          </div>
        </div>
      </section>

      {/* Account Opening Banner */}
      <BenefitBanner />

      {/* Portfolio Content (List or Chart) */}
      <PortfolioClient portfolio={portfolioWithWeight} isStandalone={isStandalone} />
    </>
  );
}
