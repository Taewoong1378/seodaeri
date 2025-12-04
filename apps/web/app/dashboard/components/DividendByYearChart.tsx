'use client';

import { useRef } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { DividendByYearData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface DividendByYearChartProps {
  data: DividendByYearData;
  variant?: 'default' | 'landing';
}

// 연도별 색상 팔레트
const YEAR_COLORS: Record<number, string> = {
  2019: '#3b82f6', // blue
  2020: '#f97316', // orange
  2021: '#eab308', // yellow
  2022: '#22c55e', // green
  2023: '#06b6d4', // cyan
  2024: '#10b981', // emerald
  2025: '#6366f1', // indigo
};

// 랜딩 페이지용 단색 팔레트 (Blue scale)
const LANDING_YEAR_COLORS: Record<number, string> = {
  2019: '#93c5fd', // blue-300
  2020: '#60a5fa', // blue-400
  2021: '#3b82f6', // blue-500
  2022: '#2563eb', // blue-600
  2023: '#1d4ed8', // blue-700
  2024: '#1e40af', // blue-800
  2025: '#1e3a8a', // blue-900
};

const getYearColor = (year: number, variant: 'default' | 'landing' = 'default'): string => {
  if (variant === 'landing') {
    // 연도에 따라 순차적으로 색상 할당 (데이터가 많을 경우 반복)
    const years = Object.keys(LANDING_YEAR_COLORS).map(Number).sort((a, b) => a - b);
    const index = years.indexOf(year);
    if (index !== -1) return LANDING_YEAR_COLORS[year] || '#3b82f6';
    // 매핑되지 않은 연도는 기본 로직 사용
    const colorValues = Object.values(LANDING_YEAR_COLORS);
    return colorValues[year % colorValues.length] || '#3b82f6';
  }
  return YEAR_COLORS[year] || '#9ca3af';
};

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `₩${(amount / 10000).toFixed(0)}만`;
  }
  return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

export function DividendByYearChart({ data, variant = 'default' }: DividendByYearChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // X축에 "월" 추가
  const chartData = data.data.map(d => ({
    ...d,
    month: `${d.month || ''}월`,
  }));

  // Y축 최대값 계산
  const allValues: number[] = [];
  for (const d of data.data) {
    for (const year of data.years) {
      const val = d[String(year)];
      if (typeof val === 'number') {
        allValues.push(val);
      }
    }
  }
  const maxValue = Math.max(...allValues, 0);
  const yMax = Math.ceil(maxValue / 50000) * 50000 + 50000;

  const renderChart = (isModal = false) => (
    <BarChart
      data={chartData}
      margin={isModal
        ? { top: 20, right: 30, left: 20, bottom: 20 }
        : { top: 10, right: 10, left: 0, bottom: 20 }
      }
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis
        dataKey="month"
        axisLine={{ stroke: '#cbd5e1' }}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 12 : 10 }}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 11 : 9 }}
        tickFormatter={(value) => formatCurrency(value)}
        domain={[0, yMax]}
        width={isModal ? 70 : 55}
      />
      <Tooltip
        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          padding: '12px',
          color: '#1e293b',
        }}
        labelStyle={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}
        formatter={(value: number, name: string) => [
          `₩${new Intl.NumberFormat('ko-KR').format(value)}`,
          `${name}년`
        ]}
      />
      {data.years.map((year) => (
        <Bar
          key={year}
          dataKey={String(year)}
          fill={getYearColor(year, variant)}
          radius={[2, 2, 0, 0]}
          maxBarSize={isModal ? 24 : 16}
        />
      ))}
    </BarChart>
  );

  const CustomLegend = ({ isModal = false }: { isModal?: boolean }) => (
    <div className={`flex flex-wrap items-center ${isModal ? 'justify-center gap-4' : 'justify-end gap-2'}`}>
      {data.years.map((year) => (
        <div key={year} className="flex items-center gap-1">
          <div
            className={`${isModal ? 'w-3 h-3' : 'w-2.5 h-2.5'} rounded-sm`}
            style={{ backgroundColor: getYearColor(year, variant) }}
          />
          <span className={`${isModal ? 'text-sm' : 'text-[10px]'} text-muted-foreground`}>{year}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">월별 배당금 현황</h4>
          {variant === 'default' && (
            <div className="flex items-center gap-2">
              <ShareChartButton chartRef={chartRef} title="월별 배당금 현황" />
              <LandscapeChartModal title="월별 배당금 현황">
                <div className="flex flex-col w-full h-full">
                  {/* Custom Legend for Modal */}
                  <div className="mb-4 shrink-0">
                    <CustomLegend isModal />
                  </div>

                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      {renderChart(true)}
                    </ResponsiveContainer>
                  </div>
                </div>
              </LandscapeChartModal>
            </div>
          )}
        </div>

        {/* Legend */}
        <CustomLegend />
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(false)}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
