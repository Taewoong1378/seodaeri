'use client';

import { useRef } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import type { YearlyDividendSummaryData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface YearlyDividendChartProps {
  data: YearlyDividendSummaryData;
}

const BAR_COLOR = '#f97316'; // orange

function formatCurrency(amount: number): string {
  return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 10000) {
    return `₩${Math.round(amount / 10000)}만`;
  }
  return `₩${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

export function YearlyDividendChart({ data }: YearlyDividendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // Y축 최대값 계산
  const maxValue = Math.max(...data.data.map(d => d.amount), 0);
  const yMax = Math.ceil(maxValue / 100000) * 100000 + 100000;

  const renderChart = (isModal = false) => (
    <BarChart
      data={data.data}
      margin={isModal
        ? { top: 30, right: 30, left: 20, bottom: 20 }
        : { top: 25, right: 10, left: 0, bottom: 20 }
      }
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <XAxis
        dataKey="year"
        axisLine={{ stroke: '#cbd5e1' }}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 12 : 10 }}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 11 : 9 }}
        tickFormatter={formatCurrencyShort}
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
        formatter={(value: number) => [formatCurrency(value), '배당금']}
      />
      <Bar
        dataKey="amount"
        fill={BAR_COLOR}
        radius={[4, 4, 0, 0]}
        maxBarSize={isModal ? 80 : 50}
      >
        <LabelList
          dataKey="amount"
          position="top"
          fill="#64748b"
          fontSize={isModal ? 12 : 10}
          formatter={(value: any) => formatCurrency(value)}
        />
        {data.data.map((entry, index) => (
          <Cell key={`cell-${entry.amount === null ? 'null' : index}`} fill={BAR_COLOR} />
        ))}
      </Bar>
    </BarChart>
  );

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">연도별 배당금 현황</h4>
        <div className="flex items-center gap-2">
          <ShareChartButton chartRef={hiddenChartRef} title="연도별 배당금 현황" />
          <LandscapeChartModal title="연도별 배당금 현황">
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

      {/* Chart */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(false)}
        </ResponsiveContainer>
      </div>

      {/* Summary - Total and Average */}
      <div className="flex gap-3">
        <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-center">
          <span className="text-[9px] text-muted-foreground block mb-0.5">총 배당금</span>
          <div className="text-[12px] font-semibold text-orange-500">
            {formatCurrency(data.data.reduce((sum, d) => sum + d.amount, 0))}
          </div>
        </div>
        <div className="flex-1 bg-muted/30 border border-border rounded-lg px-3 py-2 text-center">
          <span className="text-[9px] text-muted-foreground block mb-0.5">연평균</span>
          <div className="text-[12px] font-semibold text-muted-foreground">
            {formatCurrency(Math.round(data.data.reduce((sum, d) => sum + d.amount, 0) / data.data.length))}
          </div>
        </div>
      </div>
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
          backgroundColor: '#020617',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">연도별 배당금 현황</h3>
          <p className="text-sm text-slate-400">연도별 배당금 추이</p>
        </div>
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart(true)}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
