'use client';

import { type ReactElement, useRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { CumulativeDividendData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface CumulativeDividendChartProps {
  data: CumulativeDividendData;
}

const BAR_COLOR = '#3b82f6'; // blue

function formatCurrency(amount: number): string {
  return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 10000) {
    return `${Math.round(amount / 10000)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export function CumulativeDividendChart({ data }: CumulativeDividendChartProps): ReactElement {
  const chartRef = useRef<HTMLDivElement>(null);

  // Y축 최대값 계산
  const maxValue = Math.max(...data.data.map(d => d.cumulative), 0);
  const yMax = Math.ceil(maxValue / 100000) * 100000 + 100000;

  // 현재 누적 배당금 (마지막 값)
  const currentCumulative = data.data[data.data.length - 1]?.cumulative || 0;

  // 차트 너비 계산 (데이터 포인트 수에 따라)
  const chartWidth = Math.max(data.data.length * 26, 600);

  const renderChart = (isModal = false) => (
    <BarChart
      data={data.data}
      margin={isModal
        ? { top: 20, right: 30, left: 20, bottom: 60 }
        : { top: 10, right: 10, left: 0, bottom: 40 }
      }
    >
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
      <XAxis
        dataKey="month"
        axisLine={false}
        tickLine={false}
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isModal ? 10 : 8 }}
        angle={-45}
        textAnchor="end"
        height={isModal ? 60 : 50}
        interval={isModal ? 0 : Math.floor(data.data.length / 15)}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isModal ? 11 : 9 }}
        tickFormatter={formatCurrencyShort}
        domain={[0, yMax]}
        width={isModal ? 60 : 45}
      />
      <Tooltip
        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
        contentStyle={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          padding: '12px',
          color: '#1e293b',
        }}
        labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, marginBottom: 8 }}
        formatter={(value: number) => [formatCurrency(value), '누적 배당금']}
        labelFormatter={(label) => `${label}`}
      />
      <Bar
        dataKey="cumulative"
        fill={BAR_COLOR}
        radius={[3, 3, 0, 0]}
        maxBarSize={isModal ? 22 : 18}
      />
    </BarChart>
  );

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">배당금 누적 그래프</h4>
          <p className="text-xs text-muted-foreground mt-0.5">총 누적: {formatCurrency(currentCumulative)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareChartButton chartRef={chartRef} title="배당금 누적 그래프" />
          <LandscapeChartModal title="배당금 누적 그래프">
            <div className="flex flex-col w-full h-full">
              <div className="flex-1 min-h-0 overflow-x-auto">
                <div style={{ width: chartWidth, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart(true)}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Chart - Scrollable */}
      <div className="h-[280px] overflow-x-auto scrollbar-hide">
        <div style={{ width: chartWidth, height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(false)}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
