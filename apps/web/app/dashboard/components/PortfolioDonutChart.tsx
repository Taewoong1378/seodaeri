'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

interface PortfolioItem {
  ticker: string;
  name: string;
  totalValue: number;
  weight: number;
  yieldPercent: number;
}

interface PortfolioDonutChartProps {
  data: PortfolioItem[];
  totalAsset: number;
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
];

function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}천만`;
  }
  if (amount >= 10000) {
    return `${Math.round(amount / 10000)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

export function PortfolioDonutChart({ data, totalAsset }: PortfolioDonutChartProps) {
  // 상위 5개 + 기타로 그룹화
  const sortedData = [...data].sort((a, b) => b.weight - a.weight);
  const top5 = sortedData.slice(0, 5);
  const others = sortedData.slice(5);

  const othersTotal = others.reduce((sum, item) => sum + item.totalValue, 0);
  const othersWeight = others.reduce((sum, item) => sum + item.weight, 0);

  const chartData = [
    ...top5.map(item => ({
      name: item.name || item.ticker,
      value: item.totalValue,
      weight: item.weight,
    })),
    ...(othersWeight > 0 ? [{
      name: '기타',
      value: othersTotal,
      weight: othersWeight,
    }] : []),
  ];

  return (
    <div className="relative">
      <div className="flex items-center gap-4">
        {/* Donut Chart */}
        <div className="relative w-[140px] h-[140px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500">총 자산</span>
            <span className="text-sm font-bold text-white">{formatCurrency(totalAsset)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {chartData.slice(0, 5).map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-slate-400 truncate flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-white">{item.weight.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
