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
              <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 pointer-events-none z-20 whitespace-nowrap">
                {item.amount.toLocaleString()}원
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-white/10 rotate-45" />
              </div>

              <div className="relative w-full flex items-end justify-center h-full">
                <div 
                  className="w-full max-w-[24px] rounded-t-sm transition-all duration-300 group-hover:scale-y-[1.02] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                  style={{ 
                    height: `${heightPercentage}%`,
                    background: 'linear-gradient(180deg, #3b82f6 0%, #1e3a8a 100%)',
                    opacity: 0.9
                  }}
                >
                  {/* Top highlight line */}
                  <div className="w-full h-[1px] bg-blue-400/50 rounded-t-sm" />
                </div>
              </div>
              <span className="text-[10px] text-slate-500 mt-3 font-medium group-hover:text-blue-400 transition-colors tracking-wide">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
