'use client';

import { useRef } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface PortfolioItem {
  ticker: string;
  name: string;
  totalValue: number;
  weight: number;
  yieldPercent: number;
}

interface PortfolioDonutChartProps {
  data: PortfolioItem[];
  totalAsset: number;
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
];

function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}천만`;
  }
  if (amount >= 10000) {
    return `${Math.round(amount / 10000)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

export function PortfolioDonutChart({ data, totalAsset }: PortfolioDonutChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // 상위 5개 + 기타로 그룹화
  const sortedData = [...data].sort((a, b) => b.weight - a.weight);
  const top5 = sortedData.slice(0, 5);
  const others = sortedData.slice(5);

  const othersTotal = others.reduce((sum, item) => sum + item.totalValue, 0);
  const othersWeight = others.reduce((sum, item) => sum + item.weight, 0);

  const chartData = [
    ...top5.map(item => ({
      name: item.name || item.ticker,
      value: item.totalValue,
      weight: item.weight,
    })),
    ...(othersWeight > 0 ? [{
      name: '기타',
      value: othersTotal,
      weight: othersWeight,
    }] : []),
  ];

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">자산 비중</h4>
        <div className="flex items-center gap-2">
          <ShareChartButton chartRef={hiddenChartRef} title="포트폴리오 비중" />
          <LandscapeChartModal title="포트폴리오 비중">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-full max-w-[600px] max-h-[400px] flex items-center gap-8">
              <div className="relative flex-1 aspect-square max-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="80%"
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm text-slate-500">총 자산</span>
                  <span className="text-xl font-bold text-white">{formatCurrency(totalAsset)}</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-slate-300 truncate flex-1">{item.name}</span>
                    <span className="text-sm font-bold text-white">{item.weight.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </LandscapeChartModal>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white/[0.02] rounded-xl p-4">
        {/* Donut Chart */}
        <div className="relative w-[140px] h-[140px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500">총 자산</span>
            <span className="text-sm font-bold text-white">{formatCurrency(totalAsset)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 min-w-0">
          {chartData.slice(0, 5).map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-slate-400 truncate flex-1">{item.name}</span>
              <span className="text-xs font-semibold text-white">{item.weight.toFixed(1)}%</span>
            </div>
          ))}
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div className="w-full h-full max-w-[700px] max-h-[400px] flex items-center gap-12">
          <div className="relative flex-1 aspect-square max-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                {/* Tooltip removed for static capture, or can be kept if needed but won't show on hover */}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg text-slate-500">총 자산</span>
              <span className="text-3xl font-bold text-white">{formatCurrency(totalAsset)}</span>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">포트폴리오 비중</h3>
              <p className="text-slate-400">자산 구성 현황</p>
            </div>
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-4">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-lg text-slate-300 truncate flex-1">{item.name}</span>
                <span className="text-lg font-bold text-white">{item.weight.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
