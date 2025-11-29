interface DividendData {
  month: string;
  amount: number;
}

interface DividendChartProps {
  data: DividendData[];
}

export function DividendChart({ data }: DividendChartProps) {
  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <div className="w-full">
      <div className="flex justify-between items-end h-48 space-x-3 px-2">
        {data.map((item) => {
          const heightPercentage = Math.max((item.amount / maxAmount) * 100, 4); // Min height 4%
          
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[11px] font-bold px-2.5 py-1.5 rounded-[8px] shadow-xl transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 pointer-events-none z-20 whitespace-nowrap">
                {item.amount.toLocaleString()}원
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rotate-45" />
              </div>

              <div className="relative w-full flex items-end justify-center h-full">
                <div 
                  className="w-full max-w-[28px] rounded-t-[6px] transition-all duration-300 group-hover:scale-x-110 group-hover:shadow-[0_0_15px_rgba(var(--color-brand-secondary),0.4)]"
                  style={{ 
                    height: `${heightPercentage}%`,
                    background: 'linear-gradient(180deg, var(--color-brand-secondary) 0%, oklch(0.85 0.1 165) 100%)',
                    opacity: 0.85
                  }}
                >
                  {/* Top highlight line */}
                  <div className="w-full h-[2px] bg-white/30 rounded-t-[6px]" />
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground mt-3 font-medium group-hover:text-primary transition-colors">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
