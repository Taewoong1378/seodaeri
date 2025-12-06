import { cn } from '@repo/design-system/lib/utils';

interface HeroCardProps {
  totalAsset: number;
  totalInvested: number;
  totalProfit: number;
  totalYield: number;
  investmentDays?: number;
}

export function HeroCard({
  totalAsset,
  totalInvested,
  totalProfit,
  totalYield,
  investmentDays = 0,
}: HeroCardProps) {
  const isPositive = totalProfit >= 0;

  return (
    <div className="relative overflow-hidden rounded-[24px] p-6 shadow-lg bg-card border border-border">
      <div className="relative z-10 space-y-5">
        {/* 총 자산 */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">총 자산</p>
          <h2 className="text-[32px] font-bold tracking-tight leading-none text-foreground">
            {totalAsset.toLocaleString()}
            <span className="text-lg font-medium ml-1 text-muted-foreground">원</span>
          </h2>
        </div>

        {/* 원금, 수익, 수익률 */}
        <div className="space-y-2.5 pt-2 border-t border-border">
          {/* 원금 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">원금</span>
            <span className="text-sm font-medium text-foreground">
              {totalInvested.toLocaleString()}원
            </span>
          </div>

          {/* 수익 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">수익</span>
            <span className={cn(
              "text-sm font-semibold",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? '+ ' : ''}{totalProfit.toLocaleString()}원
            </span>
          </div>

          {/* 수익률 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">수익률</span>
            <span className={cn(
              "text-sm font-semibold",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}>
              {isPositive ? '+ ' : ''}{totalYield.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 투자 일수 */}
        {investmentDays > 0 && (
          <p className="text-sm text-muted-foreground pt-2 border-t border-border">
            <span className="font-semibold text-foreground">{investmentDays.toLocaleString()}</span>일 째 투자 중입니다
          </p>
        )}
      </div>
    </div>
  );
}
