'use client';

import { useRef } from 'react';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface MonthlyProfitLoss {
  month: string;
  profit: number;
  loss: number;
}

interface MonthlyProfitLossChartProps {
  data: MonthlyProfitLoss[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const profit = payload.find((p: any) => p.dataKey === 'profit')?.value || 0;
    const loss = payload.find((p: any) => p.dataKey === 'lossNegative')?.value || 0;
    const net = profit + loss; // loss is already negative

    return (
      <div className="bg-slate-800 border border-white/10 px-3 py-2 rounded-lg shadow-xl">
        <p className="text-slate-400 text-[10px] mb-1">{label}</p>
        {profit > 0 && (
          <p className="text-orange-400 text-xs font-medium">
            수익: +{profit.toLocaleString()}원
          </p>
        )}
        {loss < 0 && (
          <p className="text-slate-400 text-xs font-medium">
            손실: {loss.toLocaleString()}원
          </p>
        )}
        <div className="border-t border-white/10 mt-1 pt-1">
          <p className={`text-sm font-bold ${net >= 0 ? 'text-orange-400' : 'text-slate-400'}`}>
            순손익: {net >= 0 ? '+' : ''}{net.toLocaleString()}원
          </p>
        </div>
      </div>
    );
  }
  return null;
};

function formatYAxisValue(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
}

export function MonthlyProfitLossChart({ data }: MonthlyProfitLossChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) return null;

  // 데이터를 차트용으로 변환 (손실을 음수로)
  const chartData = data.map(d => ({
    month: d.month,
    profit: d.profit,
    lossNegative: d.loss > 0 ? -d.loss : 0, // 손실을 음수로 변환
    net: d.profit - d.loss,
  }));

  // 올해 총 수익/손실 계산
  const totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
  const totalLoss = data.reduce((sum, d) => sum + d.loss, 0);
  const netTotal = totalProfit - totalLoss;

  // Y축 범위 계산
  const maxProfit = Math.max(...chartData.map(d => d.profit), 0);
  const maxLoss = Math.max(...chartData.map(d => Math.abs(d.lossNegative)), 0);
  const yAxisMax = Math.ceil(Math.max(maxProfit, maxLoss) * 1.1);

  // 차트 렌더링 함수 (재사용)
  const renderChart = (height = "240px") => (
    <div className={'relative w-full'} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
          stackOffset="sign"
        >
          <defs>
            <linearGradient id="profitGradientPL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
              <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="lossGradientPL" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#475569" stopOpacity={1} />
              <stop offset="100%" stopColor="#334155" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }}
            dy={8}
            tickFormatter={(value) => value.replace('월', '')}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickFormatter={formatYAxisValue}
            domain={[-yAxisMax, yAxisMax]}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
          />
          {/* 수익 막대 (위로) */}
          <Bar
            dataKey="profit"
            stackId="stack"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`profit-${entry.month}`}
                fill={entry.profit > 0 ? 'url(#profitGradientPL)' : 'transparent'}
              />
            ))}
          </Bar>
          {/* 손실 막대 (아래로) */}
          <Bar
            dataKey="lossNegative"
            stackId="stack"
            radius={[0, 0, 4, 4]}
            maxBarSize={24}
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`loss-${entry.month}`}
                fill={entry.lossNegative < 0 ? 'url(#lossGradientPL)' : 'transparent'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">월별 손익</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 mr-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-orange-500" />
              <span className="text-[10px] text-slate-500">수익</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-slate-600" />
              <span className="text-[10px] text-slate-500">손실</span>
            </div>
          </div>
          <ShareChartButton chartRef={hiddenChartRef} title="월별 손익" />
          <LandscapeChartModal title="월별 손익">
            <div className="w-full h-full">
              {renderChart("100%")}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-orange-500" />
                <span className="text-sm text-slate-400">수익</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm bg-slate-600" />
                <span className="text-sm text-slate-400">손실</span>
              </div>
            </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Summary - 2행 레이아웃 */}
      <div className="bg-white/[0.02] rounded-xl p-4 space-y-3">
        {/* 첫 번째 줄: 총 수익, 총 손실 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">총 수익</span>
            <span className="text-sm font-bold text-orange-400">
              +{totalProfit.toLocaleString()}원
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block mb-1">총 손실</span>
            <span className="text-sm font-bold text-slate-400">
              -{totalLoss.toLocaleString()}원
            </span>
          </div>
        </div>
        {/* 두 번째 줄: 순손익 (강조) */}
        <div className="pt-3 border-t border-white/5">
          <span className="text-[10px] text-slate-500 block mb-1">순손익</span>
          <span className={`text-xl font-bold ${netTotal >= 0 ? 'text-orange-400' : 'text-red-400'}`}>
            {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Chart */}
      {renderChart()}

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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">월별 손익</h3>
            <p className="text-sm text-slate-400">순손익 {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원</p>
          </div>
        </div>
        <div className="w-full h-[350px]">
          {renderChart("100%")}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-orange-500" />
            <span className="text-sm text-slate-400">수익</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-slate-600" />
            <span className="text-sm text-slate-400">손실</span>
          </div>
        </div>
      </div>
    </div>
  );
}
