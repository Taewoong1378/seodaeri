'use client';

import { type ReactElement, useEffect, useRef } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface AccountTrendData {
  date: string;
  cumulativeDeposit: number;
  totalAccount: number;
}

interface AccountTrendChartProps {
  data: AccountTrendData[];
  currentTotalAsset?: number; // 현재 포트폴리오 총자산
  currentTotalInvested?: number; // 현재 투자원금
}

function formatCurrency(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(0)}천만`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return amount.toLocaleString();
}

export function AccountTrendChart({ data, currentTotalAsset, currentTotalInvested }: AccountTrendChartProps): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  // 현재 월 계산
  const now = new Date();
  const currentYY = String(now.getFullYear()).slice(2);
  const currentMM = String(now.getMonth() + 1).padStart(2, '0');
  const currentDateStr = `${currentYY}.${currentMM}`;

  // 현재 월까지만 데이터 필터링
  const filteredData = data.filter((item) => item.date <= currentDateStr);

  // 현재 월 데이터가 없거나 값이 0이면 포트폴리오 데이터로 대체
  const extendedData = filteredData.map(item => {
    // 현재 월이고, 계좌총액이 0이면 포트폴리오 데이터로 대체
    if (item.date === currentDateStr && item.totalAccount === 0 && currentTotalAsset && currentTotalAsset > 0) {
      // 마지막 유효한 누적입금액 찾기
      const lastValidDeposit = filteredData
        .filter(d => d.date < currentDateStr && d.cumulativeDeposit > 0)
        .pop()?.cumulativeDeposit || currentTotalInvested || 0;

      return {
        ...item,
        cumulativeDeposit: lastValidDeposit,
        totalAccount: currentTotalAsset,
      };
    }
    return item;
  });

  // 현재 월 데이터가 아예 없으면 추가
  if (currentTotalAsset && currentTotalAsset > 0) {
    const hasCurrentMonth = extendedData.some(d => d.date === currentDateStr);
    if (!hasCurrentMonth) {
      const lastValidDeposit = filteredData
        .filter(d => d.cumulativeDeposit > 0)
        .pop()?.cumulativeDeposit || currentTotalInvested || 0;

      extendedData.push({
        date: currentDateStr,
        cumulativeDeposit: lastValidDeposit,
        totalAccount: currentTotalAsset,
      });
    }
  }

  // 데이터가 0인 경우 이전 값으로 채우기 (forward fill)
  const displayData = extendedData.map((item, index) => {
    const result = { ...item };

    if (result.totalAccount === 0 && index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        const prevItem = extendedData[i];
        if (prevItem && prevItem.totalAccount !== 0) {
          result.totalAccount = prevItem.totalAccount;
          break;
        }
      }
    }

    if (result.cumulativeDeposit === 0 && index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        const prevItem = extendedData[i];
        if (prevItem && prevItem.cumulativeDeposit !== 0) {
          result.cumulativeDeposit = prevItem.cumulativeDeposit;
          break;
        }
      }
    }

    return result;
  });

  // 현재 날짜에 해당하는 위치로 스크롤
  useEffect(() => {
    if (scrollRef.current && displayData.length > 0) {
      let targetIndex = displayData.length - 1;
      for (let i = 0; i < displayData.length; i++) {
        const item = displayData[i];
        if (item && item.date >= currentDateStr) {
          targetIndex = i;
          break;
        }
      }

      const scrollPosition = Math.max(0, targetIndex * 40 - scrollRef.current.clientWidth / 2);
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [displayData, currentDateStr]);

  // Y축 범위 계산
  const allValues = displayData.flatMap(d => [d.cumulativeDeposit, d.totalAccount]);
  const maxValue = Math.max(...allValues);
  const yMax = Math.ceil(maxValue / 10000000) * 10000000 + 5000000;

  // 차트 너비 계산 (데이터 포인트당 40px)
  const chartWidth = Math.max(displayData.length * 40, 400);

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">월별 계좌추세</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 mr-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-600/70" />
              <span className="text-[11px] text-muted-foreground">누적입금액</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-lime-400/70" />
              <span className="text-[11px] text-muted-foreground">계좌총액</span>
            </div>
          </div>
          <ShareChartButton chartRef={hiddenChartRef} title="월별 계좌추세" />
          <LandscapeChartModal title="월별 계좌추세">
          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-blue-500/70" />
              <span className="text-sm text-slate-400">누적입금액</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-sm bg-rose-400/70" />
              <span className="text-sm text-slate-400">계좌총액</span>
            </div>
          </div>
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={displayData}
                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="depositGradientModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="accountGradientModal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a3e635" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#a3e635" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                {displayData.filter((d) => d.date.endsWith('.01')).map((marker) => (
                  <ReferenceLine
                    key={marker.date}
                    x={marker.date}
                    stroke="#cbd5e1"
                    label={{
                      value: `20${marker.date.split('.')[0]}년`,
                      position: 'insideTopLeft',
                      angle: -90,
                      fill: '#475569',
                      fontSize: 12,
                      dy: 30,
                    }}
                  />
                ))}
                <XAxis
                  dataKey="date"
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${Number.parseInt(value.split('.')[1])}월`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => formatCurrency(value)}
                  domain={[0, yMax]}
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
                  formatter={(value: number, name: string) => {
                    const label = name === 'cumulativeDeposit' ? '누적입금액' : '계좌총액';
                    return [`₩${value.toLocaleString()}`, label];
                  }}
                  labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeDeposit"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#depositGradientModal)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#020617', strokeWidth: 2 }}
                />
                <Area
                  type="monotone"
                  dataKey="totalAccount"
                  stroke="#a3e635"
                  strokeWidth={2}
                  fill="url(#accountGradientModal)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#a3e635', stroke: '#020617', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Scrollable Chart Container */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden pb-2 -mx-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
        style={{
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ width: chartWidth, height: 220, minWidth: '100%' }}>
          <AreaChart
            data={displayData}
            width={chartWidth}
            height={220}
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#059669" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="accountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#a3e635" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            {displayData.filter((d) => d.date.endsWith('.01')).map((marker) => (
              <ReferenceLine
                key={marker.date}
                x={marker.date}
                stroke="#cbd5e1"
                label={{
                  value: `20${marker.date.split('.')[0]}년`,
                  position: 'insideTopLeft',
                  angle: -90,
                  fill: '#475569',
                  fontSize: 12,
                  dy: 30,
                }}
              />
            ))}
            <XAxis
              dataKey="date"
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval={2}
              tickFormatter={(value) => `${Number.parseInt(value.split('.')[1])}월`}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[0, yMax]}
              width={55}
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
              formatter={(value: number, name: string) => {
                const label = name === 'cumulativeDeposit' ? '누적입금액' : '계좌총액';
                return [`₩${value.toLocaleString()}`, label];
              }}
              labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
            />
            {/* 누적입금액 (아래 레이어) */}
            <Area
              type="monotone"
              dataKey="cumulativeDeposit"
              stroke="#059669"
              strokeWidth={2}
              fill="url(#depositGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#059669',
                stroke: '#020617',
                strokeWidth: 2,
              }}
            />
            {/* 계좌총액 (위 레이어) */}
            <Area
              type="monotone"
              dataKey="totalAccount"
              stroke="#a3e635"
              strokeWidth={2}
              fill="url(#accountGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#a3e635',
                stroke: '#020617',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </div>
      </div>

      {displayData.length > 12 && (
        <p className="text-[10px] text-slate-600 text-center">
          ← 좌우로 스크롤하여 전체 기간 보기 →
        </p>
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
        <div className="mb-4">
          <h3 className="text-xl font-bold text-foreground">월별 계좌추세</h3>
          <p className="text-sm text-muted-foreground">누적입금액 vs 계좌총액</p>
        </div>
        <div className="flex items-center justify-start gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-emerald-600/70" />
            <span className="text-sm text-muted-foreground">누적입금액</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-lime-400/70" />
            <span className="text-sm text-muted-foreground">계좌총액</span>
          </div>
        </div>
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={displayData}
              margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="depositGradientHidden" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="accountGradientHidden" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a3e635" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a3e635" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              {displayData.filter((d) => d.date.endsWith('.01')).map((marker) => (
                <ReferenceLine
                  key={marker.date}
                  x={marker.date}
                  stroke="#cbd5e1"
                  label={{
                    value: `20${marker.date.split('.')[0]}년`,
                    position: 'insideTopLeft',
                    angle: -90,
                    fill: '#475569',
                    fontSize: 12,
                    dy: 30,
                  }}
                />
              ))}
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `${Number.parseInt(value.split('.')[1])}월`}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value)}
                domain={[0, yMax]}
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
                formatter={(value: number, name: string) => {
                  const label = name === 'cumulativeDeposit' ? '누적입금액' : '계좌총액';
                  return [`₩${value.toLocaleString()}`, label];
                }}
                labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
              />
              <Area
                type="monotone"
                dataKey="cumulativeDeposit"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#depositGradientHidden)"
                dot={false}
                activeDot={{ r: 6, fill: '#059669', stroke: '#020617', strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="totalAccount"
                stroke="#a3e635"
                strokeWidth={2}
                fill="url(#accountGradientHidden)"
                dot={false}
                activeDot={{ r: 6, fill: '#a3e635', stroke: '#020617', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

