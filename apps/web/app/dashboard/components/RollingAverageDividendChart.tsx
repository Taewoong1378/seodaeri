'use client';

import { useEffect, useRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { RollingAverageDividendData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface RollingAverageDividendChartProps {
  data: RollingAverageDividendData;
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

export function RollingAverageDividendChart({ data }: RollingAverageDividendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤을 우측 끝(최신)으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.data.length]);

  // Y축 최대값 계산
  const maxValue = Math.max(...data.data.map(d => d.average), 0);
  const yMax = Math.ceil(maxValue / 10000) * 10000 + 10000;

  // 현재 월평균 (마지막 값)
  const currentAverage = data.data[data.data.length - 1]?.average || 0;

  // 스크롤 필요 여부 및 차트 너비 계산
  const needsScroll = data.data.length > 15;
  const chartWidth = needsScroll ? data.data.length * 26 : undefined;

  // 모달용 adaptive X축 ticks 계산
  const totalMonths = data.data.length;
  const modalXTicks = totalMonths > 48
    ? data.data.filter(d => d.month.endsWith('.01')).map(d => d.month)
    : totalMonths > 12
      ? data.data.filter(d => {
          const m = Number.parseInt(d.month.split('.')[1] ?? '0');
          return m === 1 || m === 4 || m === 7 || m === 10;
        }).map(d => d.month)
      : undefined; // show all

  const renderChart = (isModal = false) => (
    <BarChart
      data={data.data}
      margin={isModal
        ? { top: 20, right: 30, left: 20, bottom: 20 }
        : { top: 10, right: 10, left: 0, bottom: 40 }
      }
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis
        dataKey="month"
        axisLine={{ stroke: '#cbd5e1' }}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 10 : 8 }}
        angle={-45}
        textAnchor="end"
        height={isModal ? 60 : 50}
        {...(isModal
          ? (modalXTicks !== undefined ? { ticks: modalXTicks as string[], interval: 0 as const } : { interval: 0 as const })
          : { interval: Math.floor(data.data.length / 15) }
        )}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 11 : 9 }}
        tickFormatter={formatCurrencyShort}
        domain={[0, yMax]}
        width={isModal ? 60 : 45}
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
        formatter={(value: number) => [formatCurrency(value), '12개월 평균']}
        labelFormatter={(label) => `${label}`}
      />
      <Bar
        dataKey="average"
        fill={BAR_COLOR}
        radius={[3, 3, 0, 0]}
        maxBarSize={isModal ? 22 : 18}
      />
    </BarChart>
  );

  return (
    <div ref={chartRef} className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">12개월 월평균 배당금</h4>
          <p className="text-xs text-muted-foreground mt-0.5">현재 월평균: {formatCurrency(currentAverage)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareChartButton chartRef={hiddenChartRef} title="12개월 월평균 배당금" />
          <LandscapeChartModal title="12개월 월평균 배당금">
            <div className="flex flex-col w-full h-full">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart(true)}
                </ResponsiveContainer>
              </div>
            </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Chart - Scrollable if needed */}
      {needsScroll ? (
        <div ref={scrollRef} className="h-[250px] overflow-x-auto scrollbar-hide">
          <div style={{ width: chartWidth, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(false)}
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(false)}
          </ResponsiveContainer>
        </div>
      )}

      {/* Hidden Chart for Capture */}
      <div
        ref={hiddenChartRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -50,
        opacity: 0,
        width: '800px',
        height: '450px',
        backgroundColor: '#ffffff',
        padding: '20px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>12개월 월평균 배당금</h3>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>최근 12개월 추이</p>
      </div>
      <div style={{ width: '100%', height: '350px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(true)}
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
