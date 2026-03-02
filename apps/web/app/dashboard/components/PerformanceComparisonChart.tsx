'use client';

import { useRef, useState } from 'react';
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
  sp500Dollar?: number;
  nasdaqDollar?: number;
}

interface PerformanceComparisonChartProps {
  data: PerformanceComparisonData[];
}

const LINES = [
  { dataKey: 'portfolio', name: '내 포트폴리오', color: '#059669', strokeWidth: 2.5 },
  { dataKey: 'kospi', name: '코스피', color: '#ef4444', strokeDasharray: '5 5' },
  { dataKey: 'sp500', name: 'S&P500', color: '#f59e0b', strokeDasharray: '5 5' },
  { dataKey: 'nasdaq', name: '나스닥', color: '#3b82f6', strokeDasharray: '5 5' },
];

type IndexKey = 'all' | 'kospi' | 'sp500' | 'nasdaq';
type RateMode = 'basic' | 'dollar';

const INDEX_OPTIONS: { key: IndexKey; label: string; color: string }[] = [
  { key: 'all', label: '전체', color: '#6366f1' },
  { key: 'kospi', label: '코스피', color: '#ef4444' },
  { key: 'sp500', label: 'S&P500', color: '#f59e0b' },
  { key: 'nasdaq', label: '나스닥', color: '#3b82f6' },
];

export function PerformanceComparisonChart({ data }: PerformanceComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  const [selectedIndex, setSelectedIndex] = useState<IndexKey>('all');
  const [showSelector, setShowSelector] = useState(false);
  const [rateMode, setRateMode] = useState<RateMode>('basic');
  const selectedOption = INDEX_OPTIONS.find((o) => o.key === selectedIndex)!;

  const hasDollarData = data.some(d => d.sp500Dollar !== undefined || d.nasdaqDollar !== undefined);

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

  // dollar mode일 때 sp500/nasdaq 값을 달러 환율 적용 값으로 교체
  const chartDisplayData = displayData.map(item => {
    if (rateMode !== 'dollar') return item;
    return {
      ...item,
      sp500: item.sp500Dollar ?? item.sp500,
      nasdaq: item.nasdaqDollar ?? item.nasdaq,
    };
  });

  // 선택된 지수에 따라 표시할 라인 결정
  const visibleLines = selectedIndex === 'all'
    ? LINES
    : LINES.filter(l => l.dataKey === 'portfolio' || l.dataKey === selectedIndex);

  // legend labels with (환율) suffix when in dollar mode
  const visibleLinesWithLabels = visibleLines.map(line => {
    if (rateMode === 'dollar' && (line.dataKey === 'sp500' || line.dataKey === 'nasdaq')) {
      return { ...line, name: `${line.name}(환율)` };
    }
    return line;
  });

  // Y축 범위 계산
  const allValues = chartDisplayData.flatMap(d =>
    visibleLines.map(l => d[l.dataKey as keyof typeof d] as number)
  );
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const yMin = Math.floor(minValue / 20) * 20 - 20;
  const yMax = Math.ceil(maxValue / 20) * 20 + 20;

  // X축: 투자기간에 따라 라벨 간격 변경 (AccountTrendChart와 동일)
  const totalMonths = chartDisplayData.length;
  const xTicks = totalMonths > 48
    ? chartDisplayData.filter(d => d.date.endsWith('.01')).map(d => d.date)
    : totalMonths > 12
      ? chartDisplayData.filter(d => {
          const m = Number.parseInt(d.date.split('.')[1] ?? '0');
          return m === 1 || m === 4 || m === 7 || m === 10;
        }).map(d => d.date)
      : undefined;

  // 모달용 adaptive X축 ticks
  const modalXTicks = totalMonths > 48
    ? chartDisplayData.filter(d => d.date.endsWith('.01')).map(d => d.date)
    : totalMonths > 12
      ? chartDisplayData.filter(d => {
          const m = Number.parseInt(d.date.split('.')[1] ?? '0');
          return m === 1 || m === 4 || m === 7 || m === 10;
        }).map(d => d.date)
      : undefined;

  const rateModeLabel = rateMode === 'dollar' ? '환율 적용' : '기본';

  const rateModeToggle = (
    <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => setRateMode('basic')}
        className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
          rateMode === 'basic'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        }`}
      >
        기본
      </button>
      <button
        type="button"
        onClick={() => setRateMode('dollar')}
        className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
          rateMode === 'dollar'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        }`}
      >
        환율
      </button>
    </div>
  );

  return (
    <div ref={chartRef} className="space-y-2">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {/* 비교지수 선택 드롭다운 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors"
            >
              <span>{selectedIndex === 'all' ? '전체 지수' : `vs ${selectedOption.label}`}</span>
              <svg
                className={`w-3 h-3 transition-transform ${showSelector ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <title>펼치기</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSelector && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSelector(false)}
                  onKeyDown={() => {}}
                />
                <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                  {INDEX_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedIndex(opt.key);
                        setShowSelector(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                        selectedIndex === opt.key
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 rounded" style={{ backgroundColor: opt.color }} />
                        <span>{opt.label}</span>
                      </div>
                      {selectedIndex === opt.key && (
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <title>선택됨</title>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasDollarData && rateModeToggle}
            <ShareChartButton chartRef={hiddenChartRef} title={`수익률 비교 (${rateModeLabel})`} />
            <LandscapeChartModal title="수익률 비교">
              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {LINES.map((line) => {
                    const label = rateMode === 'dollar' && (line.dataKey === 'sp500' || line.dataKey === 'nasdaq')
                      ? `${line.name}(환율)`
                      : line.name;
                    return (
                      <div key={line.dataKey} className="flex items-center gap-2">
                        <div
                          className="w-6 h-0.5"
                          style={{
                            backgroundColor: line.color,
                            backgroundImage: line.strokeDasharray ? 'none' : undefined,
                          }}
                        />
                        <span className="text-sm text-muted-foreground">{label}</span>
                      </div>
                    );
                  })}
                </div>
                {hasDollarData && (
                  <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5 ml-4">
                    <button
                      type="button"
                      onClick={() => setRateMode('basic')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        rateMode === 'basic'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground'
                      }`}
                    >
                      기본
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateMode('dollar')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                        rateMode === 'dollar'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground'
                      }`}
                    >
                      환율
                    </button>
                  </div>
                )}
              </div>
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartDisplayData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="portfolioGradientModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#059669" stopOpacity={0.1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                      {...(modalXTicks ? { ticks: modalXTicks, interval: 0 } : { interval: 0 })}
                      tickFormatter={(value) => {
                        const parts = value.split('.');
                        const month = Number.parseInt(parts[1]);
                        if (month === 1) return `'${parts[0]}`;
                        return `${month}월`;
                      }}
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
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        padding: '12px',
                        color: '#1e293b',
                      }}
                      labelStyle={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}
                      itemStyle={{ fontSize: 13, padding: '2px 0' }}
                      formatter={(value: number, name: string) => {
                        const lineConfig = LINES.find(l => l.dataKey === name);
                        let label = lineConfig?.name || name;
                        if (rateMode === 'dollar' && (name === 'sp500' || name === 'nasdaq')) {
                          label += '(환율)';
                        }
                        return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
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
            </LandscapeChartModal>
          </div>
        </div>

        {/* Legend - 별도 줄 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {visibleLinesWithLabels.map((line) => (
            <div key={line.dataKey} className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: line.color }}
              />
              <span className="text-[10px] text-muted-foreground">{line.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart - 전체 기간 한눈에 표시 */}
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartDisplayData}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }}
              {...(xTicks ? { ticks: xTicks, interval: 0 } : { interval: 0 })}
              tickFormatter={(value) => {
                const parts = value.split('.');
                const month = Number.parseInt(parts[1]);
                if (month === 1) return `'${parts[0]}`;
                return `${month}월`;
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickFormatter={(value) => `${value}%`}
              domain={[yMin, yMax]}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                padding: '12px',
                color: '#1e293b',
              }}
              labelStyle={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}
              itemStyle={{ fontSize: 12, padding: '2px 0' }}
              formatter={(value: number, name: string) => {
                const lineConfig = LINES.find(l => l.dataKey === name);
                let label = lineConfig?.name || name;
                if (rateMode === 'dollar' && (name === 'sp500' || name === 'nasdaq')) {
                  label += '(환율)';
                }
                return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
              }}
              labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
            />
            {visibleLines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 1.5}
                strokeDasharray={line.strokeDasharray}
                dot={false}
                activeDot={{ r: 4, fill: line.color, stroke: '#ffffff', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
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
        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>{rateModeLabel} | vs 주요 지수</p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', columnGap: '24px', rowGap: '8px', marginBottom: '16px' }}>
        {visibleLinesWithLabels.map((line) => (
          <div key={line.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '24px',
                height: '2px',
                backgroundColor: line.color,
                backgroundImage: line.strokeDasharray ? 'none' : undefined,
              }}
            />
            <span style={{ fontSize: '14px', color: '#64748b' }}>{line.name}</span>
          </div>
        ))}
      </div>
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartDisplayData}
            margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="portfolioGradientHidden" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              {...(modalXTicks ? { ticks: modalXTicks, interval: 0 } : { interval: 0 })}
              tickFormatter={(value) => {
                const parts = value.split('.');
                const month = Number.parseInt(parts[1]);
                if (month === 1) return `'${parts[0]}`;
                return `${month}월`;
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              domain={[yMin, yMax]}
            />
            {visibleLines.map((line) => (
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
            <Tooltip
               contentStyle={{
                 backgroundColor: '#ffffff',
                 border: '1px solid #e2e8f0',
                 borderRadius: '12px',
                 boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                 padding: '12px',
                 color: '#1e293b',
               }}
               labelStyle={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}
               itemStyle={{ fontSize: 13, padding: '2px 0' }}
               formatter={(value: number, name: string) => {
                 const lineConfig = LINES.find(l => l.dataKey === name);
                 let label = lineConfig?.name || name;
                 if (rateMode === 'dollar' && (name === 'sp500' || name === 'nasdaq')) {
                   label += '(환율)';
                 }
                 return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, label];
               }}
               labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
             />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
