'use client';

import { useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';

interface MonthlyDividend {
  month: string;
  year: number;
  amount: number;
}

interface DividendChartProps {
  data: MonthlyDividend[];
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

// 월 순서 정렬을 위한 헬퍼
const MONTH_ORDER = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

function formatYAxisValue(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export function DividendChart({ data }: DividendChartProps) {
  // 사용 가능한 연도 목록 추출 (중복 제거, 내림차순)
  const availableYears = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);

  // 현재 연도가 있으면 선택, 없으면 가장 최근 연도
  const currentYear = new Date().getFullYear();
  const defaultYear = availableYears.includes(currentYear) ? currentYear : availableYears[0];

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear || currentYear);

  // 데이터가 없으면 빈 배열 처리
  if (!data || data.length === 0) return null;

  // 선택된 연도의 데이터만 필터링
  const filteredData = data.filter(d => d.year === selectedYear);

  // 12개월 전체 데이터 생성 (빈 월도 포함)
  const fullYearData = MONTH_ORDER.map(month => {
    const found = filteredData.find(d => d.month === month);
    return {
      month,
      amount: found?.amount || 0,
    };
  });

  // 해당 연도의 총 배당금
  const yearTotal = filteredData.reduce((sum, d) => sum + d.amount, 0);

  // 차트 렌더링 함수 (재사용)
  const renderChart = (height: string = "220px", showYAxis: boolean = false) => (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={fullYearData} margin={{ top: 10, right: showYAxis ? 10 : 0, left: showYAxis ? -10 : 0, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradientDividend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: showYAxis ? 12 : 10, fontWeight: 500 }}
            dy={8}
            tickFormatter={(value) => value.replace('월', '')}
          />
          {showYAxis && (
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={formatYAxisValue}
            />
          )}
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.03)', radius: 8 }}
          />
          <Bar
            dataKey="amount"
            radius={[4, 4, 4, 4]}
            maxBarSize={28}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {fullYearData.map((entry) => (
              <Cell
                key={`cell-${entry.month}`}
                fill={entry.amount > 0 ? 'url(#barGradientDividend)' : 'rgba(255,255,255,0.05)'}
                style={{ filter: entry.amount > 0 ? 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.15))' : 'none' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="space-y-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">월별 배당금</h4>
        <LandscapeChartModal title={`${selectedYear}년 월별 배당금`}>
          <div className="w-full h-full">
            {renderChart("100%", true)}
          </div>
        </LandscapeChartModal>
      </div>

      {/* Year Selector & Total */}
      <div className="flex items-center justify-between">
        {/* Year Selector */}
        <div className="flex items-center gap-1">
          {availableYears.map(year => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedYear === year
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Total Amount */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">총</span>
          <span className="text-base font-bold text-white">{yearTotal.toLocaleString()}원</span>
        </div>
      </div>

      {/* Chart */}
      {renderChart()}
    </div>
  );
}
