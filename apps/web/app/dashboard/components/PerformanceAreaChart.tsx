'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MonthlyDividend {
  month: string;
  amount: number;
  year: number;
}

interface PerformanceAreaChartProps {
  data: MonthlyDividend[];
  totalProfit: number;
  totalYield: number;
}

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

export function PerformanceAreaChart({ data, totalProfit, totalYield }: PerformanceAreaChartProps) {
  // 누적 배당금 데이터 생성
  let cumulative = 0;
  const chartData = data.map(item => {
    cumulative += item.amount;
    return {
      month: item.month.replace('월', ''),
      amount: item.amount,
      cumulative,
    };
  });

  const isPositive = totalYield >= 0;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">총 수익금</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{formatCurrency(totalProfit)}원
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
          isPositive
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-red-500/10 text-red-400'
        }`}>
          {isPositive ? '+' : ''}{totalYield.toFixed(2)}%
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="h-[120px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                dy={10}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  padding: '12px',
                  color: '#1e293b',
                }}
                labelStyle={{ color: '#94a3b8', fontSize: 11 }}
                itemStyle={{ color: '#fff', fontSize: 12 }}
                formatter={(value: number) => [`${formatCurrency(value)}원`, '누적 배당']}
                labelFormatter={(label) => `${label}월`}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill="url(#performanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
