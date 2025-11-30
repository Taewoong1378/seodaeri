import { cn } from '@repo/design-system/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface HeroCardProps {
  totalAsset: number;
  totalYield: number;
}

export function HeroCard({ totalAsset, totalYield }: HeroCardProps) {
  const isPositive = totalYield >= 0;

  return (
    <div className="relative overflow-hidden rounded-[24px] p-7 shadow-2xl text-white group transition-all duration-500 hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-400 tracking-wide">총 자산</p>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent" />
          </div>
          <h2 className="text-[40px] font-bold tracking-tight leading-none text-white drop-shadow-sm">
            {totalAsset.toLocaleString()}
            <span className="text-xl font-medium ml-1.5 text-slate-400">원</span>
          </h2>
        </div>
        
        <div className="flex items-center mt-8">
          <div className={cn(
            "flex items-center space-x-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg transition-colors duration-300",
            isPositive 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}>
            {isPositive ? (
              <ArrowUpRight size={16} className="stroke-[2.5]" />
            ) : (
              <ArrowDownRight size={16} className="stroke-[2.5]" />
            )}
            <span className="text-sm font-bold tracking-wide">
              {isPositive ? '+' : ''}{totalYield}%
            </span>
          </div>
          <p className="ml-3 text-xs text-slate-500 font-medium tracking-wide uppercase">vs 지난달</p>
        </div>
      </div>

      {/* Premium Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none mix-blend-screen" />
    </div>
  );
}
