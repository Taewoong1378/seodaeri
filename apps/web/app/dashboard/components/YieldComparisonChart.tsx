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
import type { YieldComparisonData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface YieldComparisonChartProps {
  data: YieldComparisonData;
}

const COLORS = {
  thisYear: '#3b82f6', // blue
  annualized: '#ef4444', // red
};

export function YieldComparisonChart({ data }: YieldComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // 바 차트 데이터 변환
  const chartData = [
    {
      name: '계좌',
      thisYear: data.thisYearYield.account,
      annualized: data.annualizedYield.account,
    },
    {
      name: 'KOSPI',
      thisYear: data.thisYearYield.kospi,
      annualized: data.annualizedYield.kospi,
    },
    {
      name: 'S&P500',
      thisYear: data.thisYearYield.sp500,
      annualized: data.annualizedYield.sp500,
    },
    {
      name: 'NASDAQ',
      thisYear: data.thisYearYield.nasdaq,
      annualized: data.annualizedYield.nasdaq,
    },
  ];

  // 바 색상 결정 (양수: 해당 색상, 음수: 회색 계열)
  const getBarColor = (value: number, baseColor: string) => {
    return value >= 0 ? baseColor : '#64748b';
  };

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">수익률 비교</h4>
          <div className="flex items-center gap-2">
            <ShareChartButton chartRef={hiddenChartRef} title="수익률 비교" />
            <LandscapeChartModal title="수익률 비교">
            <div className="flex flex-col w-full h-full">
              {/* Custom Legend for Modal */}
              <div className="flex items-center justify-center gap-6 mb-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.thisYear }} />
                    <span className="text-sm text-muted-foreground">올해 수익률</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: COLORS.annualized }} />
                    <span className="text-sm text-muted-foreground">연평균 수익률</span>
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
                      cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px',
                        color: '#1e293b',
                      }}
                      labelStyle={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}
                      formatter={(value: number, name: string) => {
                        const label = name === 'thisYear' ? '올해 수익률' : '연평균 수익률';
                        return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
                      }}
                    />
                    <Bar dataKey="thisYear" fill={COLORS.thisYear} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`thisYear-${entry.name}`} fill={getBarColor(entry.thisYear, COLORS.thisYear)} />
                      ))}
                    </Bar>
                    <Bar dataKey="annualized" fill={COLORS.annualized} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={`annualized-${entry.name}`} fill={getBarColor(entry.annualized, COLORS.annualized)} />
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
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.thisYear }} />
            <span className="text-[11px] text-muted-foreground">올해 수익률</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.annualized }} />
            <span className="text-[11px] text-muted-foreground">연평균 수익률</span>
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
              tick={{ fill: '#64748b', fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
              width={40}
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
                const label = name === 'thisYear' ? '올해 수익률' : '연평균 수익률';
                return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
              }}
            />
            <Bar dataKey="thisYear" fill={COLORS.thisYear} radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`thisYear-${entry.name}`} fill={getBarColor(entry.thisYear, COLORS.thisYear)} />
              ))}
            </Bar>
            <Bar dataKey="annualized" fill={COLORS.annualized} radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`annualized-${entry.name}`} fill={getBarColor(entry.annualized, COLORS.annualized)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="bg-card border border-border rounded-xl p-3 text-center"
          >
            <span className="text-[10px] text-muted-foreground block mb-1">{item.name}</span>
            <div className="space-y-0.5">
              <div className={`text-xs font-semibold ${item.thisYear >= 0 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {item.thisYear >= 0 ? '+' : ''}{item.thisYear.toFixed(1)}%
              </div>
              <div className={`text-[10px] ${item.annualized >= 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                연평균 {item.annualized >= 0 ? '+' : ''}{item.annualized.toFixed(1)}%
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
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>수익률 비교</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>vs 주요 지수</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: COLORS.thisYear }} />
            <span style={{ fontSize: '14px', color: '#64748b' }}>올해 수익률</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: COLORS.annualized }} />
            <span style={{ fontSize: '14px', color: '#64748b' }}>연평균 수익률</span>
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
                  const label = name === 'thisYear' ? '올해 수익률' : '연평균 수익률';
                  return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
                }}
              />
              <Bar dataKey="thisYear" fill={COLORS.thisYear} radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`thisYear-${entry.name}`} fill={getBarColor(entry.thisYear, COLORS.thisYear)} />
                ))}
              </Bar>
              <Bar dataKey="annualized" fill={COLORS.annualized} radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={`annualized-${entry.name}`} fill={getBarColor(entry.annualized, COLORS.annualized)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
