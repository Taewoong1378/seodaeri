'use client';

interface DividendData {
  month: string;
  amount: number;
}

interface DividendChartProps {
  data: DividendData[];
}

export function DividendChart({ data }: DividendChartProps) {
  const amounts = data.map(d => d.amount);
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;

  // 차트 최대 높이 (픽셀)
  const maxBarHeight = 160;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end space-x-3 px-2" style={{ height: `${maxBarHeight + 40}px` }}>
        {data.map((item) => {
          // 바 높이를 픽셀로 계산
          const barHeight = maxAmount > 0
            ? Math.max((item.amount / maxAmount) * maxBarHeight, 8)
            : 8;

          return (
            <div key={item.month} className="flex-1 flex flex-col items-center justify-end group relative h-full">
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 transition-all duration-200 pointer-events-none z-20 whitespace-nowrap">
                {item.amount.toLocaleString()}원
                <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 border-r border-b border-white/10 rotate-45" />
              </div>

              {/* Bar */}
              <div
                className="w-full max-w-[28px] rounded-t-md transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                style={{
                  height: `${barHeight}px`,
                  background: 'linear-gradient(180deg, #3b82f6 0%, #1e3a8a 100%)',
                }}
              >
              </div>

              {/* Label */}
              <span className="text-[11px] text-slate-500 mt-3 font-medium group-hover:text-blue-400 transition-colors">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
