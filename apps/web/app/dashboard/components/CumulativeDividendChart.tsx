'use client';

import { type ReactElement, useEffect, useRef } from 'react';
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
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 스크롤을 우측 끝(최신)으로 이동
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data.data.length]);

  // Y축 최대값 계산
  const maxValue = Math.max(...data.data.map(d => d.cumulative), 0);
  const yMax = Math.ceil(maxValue / 100000) * 100000 + 100000;

  // 현재 누적 배당금 (마지막 값)
  const currentCumulative = data.data[data.data.length - 1]?.cumulative || 0;

  // 차트 너비 계산: 데이터가 적으면 컨테이너에 맞추기 (고정), 많으면 스크롤
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
        ? { top: 10, right: 10, left: 10, bottom: 5 }
        : { top: 10, right: 10, left: 0, bottom: 5 }
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
        height={isModal ? 45 : 35}
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
        formatter={(value: number) => [formatCurrency(value), '누적 배당금']}
        labelFormatter={(label) => `${label}`}
        {...(isModal ? {} : {})}
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
    <div ref={chartRef} className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">배당금 누적 그래프</h4>
          <p className="text-xs text-muted-foreground mt-0.5">총 누적: {formatCurrency(currentCumulative)}</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareChartButton chartRef={hiddenChartRef} title="배당금 누적 그래프" />
          <LandscapeChartModal title="배당금 누적 그래프">
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

      {/* Chart - 데이터 적으면 고정, 많으면 스크롤 */}
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
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>배당금 누적 그래프</h3>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>총 누적: {formatCurrency(currentCumulative)}</p>
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
