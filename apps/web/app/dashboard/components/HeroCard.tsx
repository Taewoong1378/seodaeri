import { cn } from '@repo/design-system/lib/utils';
import { Wallet } from 'lucide-react';

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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">투자 원금</span>
            <p className="text-sm font-semibold text-foreground">{totalInvested.toLocaleString()}원</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">평가 손익</span>
             <div className="flex items-center gap-1.5 flex-wrap">
              <p className={cn(
                "text-sm font-bold whitespace-nowrap",
                isPositive ? "text-emerald-600" : "text-red-600"
              )}>
                {isPositive ? '+' : ''}{totalProfit.toLocaleString()}원
              </p>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-[6px] font-medium",
                isPositive 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "bg-red-50 text-red-700"
              )}>
                {isPositive ? '+' : ''}{totalYield.toFixed(1)}%
              </span>
            </div>
          </div>
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
