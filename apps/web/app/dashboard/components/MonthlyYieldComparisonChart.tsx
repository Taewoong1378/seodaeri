'use client';

import { useRef } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { MonthlyYieldComparisonData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface MonthlyYieldComparisonChartProps {
  data: MonthlyYieldComparisonData;
}

const COLORS = {
  currentMonth: '#9ca3af', // gray
  thisYear: '#f97316', // orange
};

export function MonthlyYieldComparisonChart({ data }: MonthlyYieldComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // 바 차트 데이터 변환
  const chartData = [
    {
      name: '계좌',
      currentMonth: data.currentMonthYield.account,
      thisYear: data.thisYearYield.account,
    },
    {
      name: 'KOSPI',
      currentMonth: data.currentMonthYield.kospi,
      thisYear: data.thisYearYield.kospi,
    },
    {
      name: 'S&P500',
      currentMonth: data.currentMonthYield.sp500,
      thisYear: data.thisYearYield.sp500,
    },
    {
      name: 'NASDAQ',
      currentMonth: data.currentMonthYield.nasdaq,
      thisYear: data.thisYearYield.nasdaq,
    },
    {
      name: 'DOLLAR',
      currentMonth: data.currentMonthYield.dollar,
      thisYear: data.thisYearYield.dollar,
    },
  ];

  const currentYear = new Date().getFullYear();

  // 바 색상 결정 (양수: 해당 색상, 음수: 회색 계열)
  const getBarColor = (value: number, baseColor: string) => {
    return value >= 0 ? baseColor : '#64748b';
  };

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">{currentYear}년 {data.currentMonth}, 누적 수익률 현황</h4>
          <div className="flex items-center gap-2">
            <ShareChartButton chartRef={hiddenChartRef} title={`${currentYear}년 ${data.currentMonth}, 누적 수익률 현황`} />
            <LandscapeChartModal title={`${currentYear}년 ${data.currentMonth}, 누적 수익률 현황`}>
              <div className="flex flex-col w-full h-full">
                {/* Custom Legend for Modal */}
                <div className="flex items-center justify-center gap-6 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.currentMonth }} />
                    <span className="text-sm text-muted-foreground">{data.currentMonth} 수익률</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.thisYear }} />
                    <span className="text-sm text-muted-foreground">올해 수익률</span>
                  </div>
                </div>

                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <ReferenceLine y={0} stroke="#cbd5e1" />
                      <XAxis
                        dataKey="name"
                        axisLine={{ stroke: '#cbd5e1' }}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 14 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                          padding: '12px',
                          color: 'hsl(var(--popover-foreground))',
                        }}
                        labelStyle={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}
                        formatter={(value: number, name: string) => {
                          const label = name === 'currentMonth' ? `${data.currentMonth} 수익률` : '올해 수익률';
                          return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
                        }}
                      />
                      <Bar dataKey="currentMonth" fill={COLORS.currentMonth} radius={[4, 4, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell key={`currentMonth-${entry.name}`} fill={getBarColor(entry.currentMonth, COLORS.currentMonth)} />
                        ))}
                      </Bar>
                      <Bar dataKey="thisYear" fill={COLORS.thisYear} radius={[4, 4, 0, 0]}>
                        {chartData.map((entry) => (
                          <Cell key={`thisYear-${entry.name}`} fill={getBarColor(entry.thisYear, COLORS.thisYear)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </LandscapeChartModal>
          </div>
        </div>

        {/* Legend - Moved below title */}
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.currentMonth }} />
            <span className="text-[11px] text-muted-foreground">{data.currentMonth} 수익률</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.thisYear }} />
            <span className="text-[11px] text-muted-foreground">올해 수익률</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            <XAxis
              dataKey="name"
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
              width={45}
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
              labelStyle={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}
              formatter={(value: number, name: string) => {
                const label = name === 'currentMonth' ? `${data.currentMonth} 수익률` : '올해 수익률';
                return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
              }}
            />
            <Bar dataKey="currentMonth" fill={COLORS.currentMonth} radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`currentMonth-${entry.name}`} fill={getBarColor(entry.currentMonth, COLORS.currentMonth)} />
              ))}
            </Bar>
            <Bar dataKey="thisYear" fill={COLORS.thisYear} radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`thisYear-${entry.name}`} fill={getBarColor(entry.thisYear, COLORS.thisYear)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards - 5 columns for DOLLAR */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="flex-1 min-w-[56px] bg-card border border-border rounded-lg px-1.5 py-2 text-center"
          >
            <span className="text-[8px] text-muted-foreground block mb-0.5 truncate">{item.name}</span>
            <div className="space-y-0">
              <div className={`text-[10px] font-semibold leading-tight ${item.thisYear >= 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                {item.thisYear >= 0 ? '+' : ''}{item.thisYear.toFixed(1)}%
              </div>
              <div className={`text-[8px] leading-tight ${item.currentMonth >= 0 ? 'text-gray-500' : 'text-muted-foreground'}`}>
                {data.currentMonth} {item.currentMonth >= 0 ? '+' : ''}{item.currentMonth.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
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
          backgroundColor: '#ffffff',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{currentYear}년 {data.currentMonth}, 누적 수익률 현황</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>vs 주요 지수</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: COLORS.currentMonth }} />
            <span style={{ fontSize: '14px', color: '#64748b' }}>{data.currentMonth} 수익률</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: COLORS.thisYear }} />
            <span style={{ fontSize: '14px', color: '#64748b' }}>올해 수익률</span>
          </div>
        </div>
        <div style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 14 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  padding: '12px',
                }}
                labelStyle={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}
                formatter={(value: number, name: string) => {
                  const label = name === 'currentMonth' ? `${data.currentMonth} 수익률` : '올해 수익률';
                  return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
                }}
              />
              <Bar dataKey="currentMonth" fill={COLORS.currentMonth} radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`currentMonth-${entry.name}`} fill={getBarColor(entry.currentMonth, COLORS.currentMonth)} />
                ))}
              </Bar>
              <Bar dataKey="thisYear" fill={COLORS.thisYear} radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`thisYear-${entry.name}`} fill={getBarColor(entry.thisYear, COLORS.thisYear)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
