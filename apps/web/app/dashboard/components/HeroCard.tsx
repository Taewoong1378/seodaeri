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
    <div className="relative overflow-hidden rounded-[24px] shadow-lg border border-border/50 group">
      {/* Premium Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800" />
      
      {/* Decorative Aura */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-blue-400/10">
                <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">총 자산</p>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight leading-none text-foreground flex items-baseline gap-1.5">
              {totalAsset.toLocaleString()}
              <span className="text-xl font-medium text-muted-foreground">원</span>
            </h2>
          </div>
          
          {/* Investment Days Badge */}
          {investmentDays > 0 && (
            <div className="px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-sm">
              <p className="text-xs font-medium text-foreground">
                <span className="text-blue-600 dark:text-blue-400 font-bold mr-1">D+{investmentDays.toLocaleString()}</span>
                투자중
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">투자 원금</span>
            <p className="text-sm font-semibold text-foreground">{totalInvested.toLocaleString()}원</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">평가 손익</span>
             <div className="flex items-center gap-1.5">
              <p className={cn(
                "text-sm font-bold",
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {isPositive ? '+' : ''}{totalProfit.toLocaleString()}원
              </p>
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-[6px] font-medium",
                isPositive 
                  ? "bg-emerald-100/50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" 
                  : "bg-red-100/50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
              )}>
                {isPositive ? '+' : ''}{totalYield.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
