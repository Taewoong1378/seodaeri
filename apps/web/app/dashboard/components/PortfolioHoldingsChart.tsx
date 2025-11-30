'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';

interface PortfolioItem {
  ticker: string;
  name: string;
  totalValue: number;
  weight: number;
  yieldPercent: number;
  profit: number;
}

interface PortfolioHoldingsChartProps {
  data: PortfolioItem[];
}

const COLORS = [
  { bg: 'bg-blue-500', bar: 'from-blue-500 to-blue-400' },
  { bg: 'bg-purple-500', bar: 'from-purple-500 to-purple-400' },
  { bg: 'bg-cyan-500', bar: 'from-cyan-500 to-cyan-400' },
  { bg: 'bg-emerald-500', bar: 'from-emerald-500 to-emerald-400' },
  { bg: 'bg-amber-500', bar: 'from-amber-500 to-amber-400' },
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

export function PortfolioHoldingsChart({ data }: PortfolioHoldingsChartProps) {
  // 상위 5개만 표시
  const top5 = [...data].sort((a, b) => b.weight - a.weight).slice(0, 5);
  const maxWeight = Math.max(...top5.map(item => item.weight));

  return (
    <div className="space-y-4">
      {top5.map((item, index) => (
        <div key={item.ticker} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full ${COLORS[index % COLORS.length]?.bg} flex-shrink-0`} />
              <span className="text-sm font-medium text-white truncate">
                {item.name || item.ticker}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              <span className="text-sm font-semibold text-white">
                {formatCurrency(item.totalValue)}원
              </span>
              <div className={`flex items-center gap-0.5 text-xs font-medium ${
                item.yieldPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {item.yieldPercent >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                {item.yieldPercent >= 0 ? '+' : ''}{item.yieldPercent.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${COLORS[index % COLORS.length]?.bar} rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${(item.weight / maxWeight) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>{item.ticker}</span>
            <span>{item.weight.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
