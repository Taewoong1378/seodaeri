'use client';

import { useRef } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { MajorIndexYieldComparisonData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface MajorIndexYieldComparisonChartProps {
  data: MajorIndexYieldComparisonData;
}

const COLORS = {
  sp500: '#ef4444', // red
  nasdaq: '#9ca3af', // gray
  kospi: '#3b82f6', // blue
  account: '#22c55e', // green
};

export function MajorIndexYieldComparisonChart({ data }: MajorIndexYieldComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // 라인 차트 데이터 변환
  const chartData = data.months.map((month, idx) => ({
    name: month,
    sp500: data.sp500[idx],
    nasdaq: data.nasdaq[idx],
    kospi: data.kospi[idx],
    account: data.account[idx],
  }));

  const currentYear = new Date().getFullYear();

  // Y축 범위 계산 (account의 null 값 제외)
  const accountValues = data.account.filter((v): v is number => v !== null);
  const allValues = [...data.sp500, ...data.nasdaq, ...data.kospi, ...accountValues];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const yMin = Math.floor(minValue / 25) * 25 - 25;
  const yMax = Math.ceil(maxValue / 25) * 25 + 25;

  const renderChart = (isModal = false) => (
    <LineChart
      data={chartData}
      margin={isModal
        ? { top: 20, right: 30, left: 10, bottom: 20 }
        : { top: 10, right: 10, left: -10, bottom: 0 }
      }
    >
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
      <XAxis
        dataKey="name"
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#94a3b8', fontSize: isModal ? 12 : 10 }}
        interval={isModal ? 0 : 'preserveStartEnd'}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: isModal ? 12 : 10 }}
        tickFormatter={(value) => `${value}%`}
        domain={[yMin, yMax]}
        width={isModal ? 50 : 45}
      />
      <Tooltip
        cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
        contentStyle={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          padding: '12px',
        }}
        labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}
        formatter={(value: number, name: string) => {
          const labels: Record<string, string> = {
            sp500: 'S&P500',
            nasdaq: '나스닥',
            kospi: '코스피',
            account: '투자',
          };
          return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, labels[name] || name];
        }}
      />
      <Line
        type="monotone"
        dataKey="sp500"
        stroke={COLORS.sp500}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: COLORS.sp500, strokeWidth: 0, r: isModal ? 4 : 3 }}
        activeDot={{ r: isModal ? 6 : 5 }}
        name="sp500"
      />
      <Line
        type="monotone"
        dataKey="nasdaq"
        stroke={COLORS.nasdaq}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: COLORS.nasdaq, strokeWidth: 0, r: isModal ? 4 : 3 }}
        activeDot={{ r: isModal ? 6 : 5 }}
        name="nasdaq"
      />
      <Line
        type="monotone"
        dataKey="kospi"
        stroke={COLORS.kospi}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: COLORS.kospi, strokeWidth: 0, r: isModal ? 4 : 3 }}
        activeDot={{ r: isModal ? 6 : 5 }}
        name="kospi"
      />
      <Line
        type="monotone"
        dataKey="account"
        stroke={COLORS.account}
        strokeWidth={2}
        dot={{ fill: COLORS.account, strokeWidth: 0, r: isModal ? 4 : 3 }}
        activeDot={{ r: isModal ? 6 : 5 }}
        name="account"
      />
    </LineChart>
  );

  const CustomLegend = ({ isModal = false }: { isModal?: boolean }) => (
    <div className={`flex items-center ${isModal ? 'justify-center gap-6' : 'justify-end gap-3'}`}>
      <div className="flex items-center gap-1.5">
        <div className={`${isModal ? 'w-4 h-0.5' : 'w-3 h-0.5'} rounded`} style={{ backgroundColor: COLORS.sp500 }} />
        <span className={`${isModal ? 'text-sm' : 'text-[11px]'} text-slate-400`}>S&P500</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`${isModal ? 'w-4 h-0.5' : 'w-3 h-0.5'} rounded`} style={{ backgroundColor: COLORS.nasdaq }} />
        <span className={`${isModal ? 'text-sm' : 'text-[11px]'} text-slate-400`}>나스닥</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`${isModal ? 'w-4 h-0.5' : 'w-3 h-0.5'} rounded`} style={{ backgroundColor: COLORS.kospi }} />
        <span className={`${isModal ? 'text-sm' : 'text-[11px]'} text-slate-400`}>코스피</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`${isModal ? 'w-4 h-0.5' : 'w-3 h-0.5'} rounded`} style={{ backgroundColor: COLORS.account }} />
        <span className={`${isModal ? 'text-sm' : 'text-[11px]'} text-slate-400`}>투자</span>
      </div>
    </div>
  );

  // 현재 값 (마지막 데이터)
  const latestIdx = data.months.length - 1;
  
  const latestSp500 = data.sp500[latestIdx];
  const latestNasdaq = data.nasdaq[latestIdx];
  const latestKospi = data.kospi[latestIdx];

  // 투자의 마지막 유효 값 찾기
  const lastValidAccountIdx = data.account.reduce<number>((lastIdx, val, idx) => val !== null ? idx : lastIdx, 0);
  const lastValidAccountValue = data.account[lastValidAccountIdx];

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">{currentYear}년 주요지수 수익률 비교</h4>
          <div className="flex items-center gap-2">
            <ShareChartButton chartRef={hiddenChartRef} title={`${currentYear}년 주요지수 수익률 비교`} />
            <LandscapeChartModal title={`${currentYear}년 주요지수 수익률 비교`}>
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
        </div>

        {/* Legend */}
        <CustomLegend />
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(false)}
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <div className="flex-1 min-w-[70px] bg-white/[0.03] border border-white/5 rounded-lg px-2 py-2 text-center">
          <span className="text-[9px] text-slate-500 block mb-0.5">S&P500</span>
          {latestSp500 !== undefined ? (
            <div className={`text-[11px] font-semibold ${latestSp500 >= 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {latestSp500 >= 0 ? '+' : ''}{latestSp500.toFixed(1)}%
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-slate-500">-</div>
          )}
        </div>
        <div className="flex-1 min-w-[70px] bg-white/[0.03] border border-white/5 rounded-lg px-2 py-2 text-center">
          <span className="text-[9px] text-slate-500 block mb-0.5">나스닥</span>
          {latestNasdaq !== undefined ? (
            <div className={`text-[11px] font-semibold ${latestNasdaq >= 0 ? 'text-gray-300' : 'text-slate-400'}`}>
              {latestNasdaq >= 0 ? '+' : ''}{latestNasdaq.toFixed(1)}%
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-slate-500">-</div>
          )}
        </div>
        <div className="flex-1 min-w-[70px] bg-white/[0.03] border border-white/5 rounded-lg px-2 py-2 text-center">
          <span className="text-[9px] text-slate-500 block mb-0.5">코스피</span>
          {latestKospi !== undefined ? (
            <div className={`text-[11px] font-semibold ${latestKospi >= 0 ? 'text-blue-400' : 'text-slate-400'}`}>
              {latestKospi >= 0 ? '+' : ''}{latestKospi.toFixed(1)}%
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-slate-500">-</div>
          )}
        </div>
        <div className="flex-1 min-w-[70px] bg-white/[0.03] border border-white/5 rounded-lg px-2 py-2 text-center">
          <span className="text-[9px] text-slate-500 block mb-0.5">투자</span>
          {lastValidAccountValue != null ? (
            <div className={`text-[11px] font-semibold ${lastValidAccountValue >= 0 ? 'text-green-400' : 'text-slate-400'}`}>
              {lastValidAccountValue >= 0 ? '+' : ''}{lastValidAccountValue.toFixed(1)}%
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-slate-500">-</div>
          )}
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
          <h3 className="text-xl font-bold text-white">{currentYear}년 주요지수 수익률 비교</h3>
          <p className="text-sm text-slate-400">vs S&P500, NASDAQ, KOSPI</p>
        </div>
        <div className="mb-4">
          <CustomLegend isModal />
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
