'use client';

import { useEffect, useRef } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface PerformanceComparisonData {
  date: string;
  portfolio: number;
  kospi: number;
  sp500: number;
  nasdaq: number;
}

interface PerformanceComparisonChartProps {
  data: PerformanceComparisonData[];
}

const LINES = [
  { dataKey: 'portfolio', name: '내 포트폴리오', color: '#ffffff', strokeWidth: 2.5 },
  { dataKey: 'kospi', name: '코스피', color: '#ef4444', strokeDasharray: '5 5' },
  { dataKey: 'sp500', name: 'S&P500', color: '#f59e0b', strokeDasharray: '5 5' },
  { dataKey: 'nasdaq', name: '나스닥', color: '#3b82f6', strokeDasharray: '5 5' },
];

export function PerformanceComparisonChart({ data }: PerformanceComparisonChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // 현재 연월 계산
  const now = new Date();
  const currentYY = String(now.getFullYear()).slice(2);
  const currentMM = String(now.getMonth() + 1).padStart(2, '0');
  const currentDate = `${currentYY}.${currentMM}`;

  // 현재 월까지만 데이터 필터링
  const filteredData = data.filter((item) => {
    // date 형식: "YY.MM" (예: "25.12")
    return item.date <= currentDate;
  });

  // 데이터가 0인 경우 이전 값으로 채우기 (forward fill)
  const displayData = filteredData.map((item, index) => {
    const result = { ...item };

    // portfolio가 0이면 이전 값 사용
    if (result.portfolio === 0 && index > 0) {
      // 이전에 유효한 값을 찾기
      for (let i = index - 1; i >= 0; i--) {
        if (filteredData[i]?.portfolio !== 0) {
          result.portfolio = filteredData[i]?.portfolio || 0;
          break;
        }
      }
    }

    return result;
  });

  // 현재 날짜 위치로 스크롤 (마지막 데이터가 보이도록)
  useEffect(() => {
    if (scrollRef.current && displayData.length > 0) {
      // 마지막 데이터가 보이도록 스크롤
      const scrollPosition = Math.max(0, displayData.length * 40 - scrollRef.current.clientWidth + 40);
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [displayData]);

  // Y축 범위 계산
  const allValues = displayData.flatMap(d => [d.portfolio, d.kospi, d.sp500, d.nasdaq]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const yMin = Math.floor(minValue / 20) * 20 - 20;
  const yMax = Math.ceil(maxValue / 20) * 20 + 20;

  // 차트 너비 계산 (데이터 포인트당 40px)
  const chartWidth = Math.max(displayData.length * 40, 400);

  return (
    <div ref={chartRef} className="space-y-4">
      <div className="flex items-center justify-between">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {LINES.map((line) => (
            <div key={line.dataKey} className="flex items-center gap-1.5">
              <div
                className="w-4 h-0.5"
                style={{
                  backgroundColor: line.color,
                  backgroundImage: line.strokeDasharray ? 'none' : undefined,
                }}
              />
              <span className="text-[11px] text-slate-400">{line.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ShareChartButton chartRef={hiddenChartRef} title="수익률 비교" />
          <LandscapeChartModal title="수익률 비교">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={displayData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                <defs>
                  <linearGradient id="portfolioGradientModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[yMin, yMax]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                    padding: '12px',
                  }}
                  labelStyle={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}
                  itemStyle={{ fontSize: 13, padding: '2px 0' }}
                  formatter={(value: number, name: string) => {
                    const lineConfig = LINES.find(l => l.dataKey === name);
                    return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, lineConfig?.name || name];
                  }}
                  labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
                />
                {LINES.map((line) => (
                  <Line
                    key={line.dataKey}
                    type="monotone"
                    dataKey={line.dataKey}
                    name={line.dataKey}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth || 2}
                    strokeDasharray={line.strokeDasharray}
                    dot={false}
                    activeDot={{ r: 6, fill: line.color, stroke: '#020617', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4">
            {LINES.map((line) => (
              <div key={line.dataKey} className="flex items-center gap-2">
                <div
                  className="w-6 h-0.5"
                  style={{
                    backgroundColor: line.color,
                    backgroundImage: line.strokeDasharray ? 'none' : undefined,
                  }}
                />
                <span className="text-sm text-slate-400">{line.name}</span>
              </div>
            ))}
          </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Scrollable Chart Container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-2 -mx-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        style={{
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ width: chartWidth, height: 220, minWidth: '100%' }}>
          <LineChart
            data={displayData}
            width={chartWidth}
            height={220}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval={2}
              tickFormatter={(value) => value}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(value) => `${value}%`}
              domain={[yMin, yMax]}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                padding: '12px',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}
              itemStyle={{ fontSize: 12, padding: '2px 0' }}
              formatter={(value: number, name: string) => {
                const lineConfig = LINES.find(l => l.dataKey === name);
                return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, lineConfig?.name || name];
              }}
              labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
            />
            {LINES.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 1.5}
                strokeDasharray={line.strokeDasharray}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: line.color,
                  stroke: '#020617',
                  strokeWidth: 2,
                }}
              />
            ))}
          </LineChart>
        </div>
      </div>

      {/* Scroll hint */}
      {displayData.length > 12 && (
        <p className="text-[10px] text-slate-600 text-center">← 좌우로 스크롤하여 전체 기간 보기 →</p>
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
          backgroundColor: '#020617',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white">수익률 비교</h3>
          <p className="text-sm text-slate-400">vs 주요 지수</p>
        </div>
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="portfolioGradientHidden" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => value}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
                domain={[yMin, yMax]}
              />
              {LINES.map((line) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.dataKey}
                  stroke={line.color}
                  strokeWidth={line.strokeWidth || 2}
                  strokeDasharray={line.strokeDasharray}
                  dot={false}
                  activeDot={{ r: 6, fill: line.color, stroke: '#020617', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
              {/* Legend for captured image */}
              <Tooltip
                 contentStyle={{
                   backgroundColor: '#1e293b',
                   border: '1px solid rgba(255,255,255,0.1)',
                   borderRadius: '12px',
                   boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                   padding: '12px',
                 }}
                 labelStyle={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}
                 itemStyle={{ fontSize: 13, padding: '2px 0' }}
                 formatter={(value: number, name: string) => {
                   const lineConfig = LINES.find(l => l.dataKey === name);
                   return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, lineConfig?.name || name];
                 }}
                 labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
               />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4">
          {LINES.map((line) => (
            <div key={line.dataKey} className="flex items-center gap-2">
              <div
                className="w-6 h-0.5"
                style={{
                  backgroundColor: line.color,
                  backgroundImage: line.strokeDasharray ? 'none' : undefined,
                }}
              />
              <span className="text-sm text-slate-400">{line.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
