import { cn } from '@repo/design-system/lib/utils';
import { Wallet } from 'lucide-react';

interface HeroCardProps {
  totalAsset: number;
  totalInvested: number;
  totalProfit: number;
  totalYield: number;
  thisMonthProfit?: number;
  thisMonthYield?: number;
  thisYearProfit?: number;
  thisYearYield?: number;
  investmentDays?: number;
}

function StatItem({ label, amount, yield: yieldPercent }: { label: string; amount: number; yield?: number }) {
  const isPositive = amount >= 0;
  const hasYield = yieldPercent !== undefined && yieldPercent !== null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {label === '원금' ? (
        <p className="text-sm font-semibold text-foreground">{amount.toLocaleString()}원</p>
      ) : (
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-bold whitespace-nowrap",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositive ? '+' : ''}{amount.toLocaleString()}원
          </p>
          {hasYield && (
            <span className={cn(
              "inline-block text-xs px-1.5 py-0.5 rounded-[6px] font-medium",
              isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            )}>
              {isPositive ? '+' : ''}{yieldPercent.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function HeroCard({
  totalAsset,
  totalInvested,
  totalProfit,
  totalYield,
  thisMonthProfit,
  thisMonthYield,
  thisYearProfit,
  thisYearYield,
  investmentDays = 0,
}: HeroCardProps) {
  return (
    <div className="relative overflow-hidden rounded-[24px] shadow-sm border border-border bg-card group">
      <div className="relative z-10 p-6 space-y-6">
        {/* Header Section */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">총 자산</p>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-none text-foreground flex items-baseline gap-1.5">
            {totalAsset.toLocaleString()}
            <span className="text-xl font-medium text-muted-foreground">원</span>
          </h2>
        </div>

        {/* Stats Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
          <StatItem label="원금" amount={totalInvested} />
          <StatItem label="누적손익" amount={totalProfit} yield={totalYield} />
          {thisMonthProfit !== undefined && (
            <StatItem label="이번달 손익" amount={thisMonthProfit} yield={thisMonthYield} />
          )}
          {thisYearProfit !== undefined && (
            <StatItem label="올해손익" amount={thisYearProfit} yield={thisYearYield} />
          )}
        </div>

        {/* Investment Days Badge (Bottom) */}
        {investmentDays > 0 && (
          <div className="flex justify-center pt-2">
            <p className="text-sm font-medium text-muted-foreground text-[20px]">
              벌써 <span className="text-blue-600 font-bold">{investmentDays.toLocaleString()}</span>일째 투자중이에요!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
