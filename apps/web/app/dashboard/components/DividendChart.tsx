'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

interface DividendData {
  month: string;
  amount: number;
}

interface DividendChartProps {
  data: DividendData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 px-3 py-2 rounded-lg shadow-xl">
        <p className="text-slate-400 text-[10px] mb-0.5">{label}</p>
        <p className="text-white text-sm font-bold">
          {payload[0].value.toLocaleString()}원
        </p>
      </div>
    );
  }
  return null;
};

export function DividendChart({ data }: DividendChartProps) {
  // 데이터가 없으면 빈 배열 처리
  if (!data || data.length === 0) return null;

  // 최대값 계산 (Y축 스케일링용)
  const maxAmount = Math.max(...data.map(d => d.amount));

  return (
    <div className="w-full h-[200px] mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
            dy={10}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ fill: 'rgba(255, 255, 255, 0.03)', radius: 8 }}
          />
          <Bar 
            dataKey="amount" 
            radius={[6, 6, 6, 6]}
            maxBarSize={40}
            animationDuration={1500}
            animationEasing="ease-out"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${entry.month}`} 
                fill="url(#barGradient)"
                className="transition-all duration-300 hover:opacity-100"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.15))' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
