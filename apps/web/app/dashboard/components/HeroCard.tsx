import { cn } from '@repo/design-system/lib/utils';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface HeroCardProps {
  totalAsset: number;
  totalYield: number;
}

export function HeroCard({ totalAsset, totalYield }: HeroCardProps) {
  const isPositive = totalYield >= 0;

  return (
    <div className="relative overflow-hidden rounded-[24px] p-7 shadow-xl text-white group transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(120deg, var(--color-brand-gradient-start), var(--color-brand-gradient-end))',
        boxShadow: '0 20px 40px -10px rgba(var(--color-brand-primary), 0.3)'
      }}
    >
      <div className="relative z-10 flex flex-col h-full justify-between min-h-[140px]">
        <div>
          <p className="text-sm font-medium text-white/80 mb-1 tracking-wide">총 자산</p>
          <h2 className="text-4xl font-bold tracking-tight">
            {totalAsset.toLocaleString()}
            <span className="text-2xl font-medium ml-1 opacity-80">원</span>
          </h2>
        </div>
        
        <div className="flex items-center mt-6">
          <div className="flex items-center space-x-2 bg-white/15 w-fit px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-inner">
            {isPositive ? (
              <ArrowUpRight size={18} className="text-[#a3ffb6]" />
            ) : (
              <ArrowDownRight size={18} className="text-[#ffb3b3]" />
            )}
            <span className={cn(
              "text-base font-bold",
              isPositive ? "text-[#a3ffb6]" : "text-[#ffb3b3]"
            )}>
              {isPositive ? '+' : ''}{totalYield}%
            </span>
          </div>
          <p className="ml-3 text-sm text-white/70 font-medium">지난달 대비</p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-40 h-40 bg-black/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
    </div>
  );
}
