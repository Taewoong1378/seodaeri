'use client';

import { useEffect, useRef } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';

interface AccountTrendData {
  date: string;
  cumulativeDeposit: number;
  totalAccount: number;
}

interface AccountTrendChartProps {
  data: AccountTrendData[];
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

export function AccountTrendChart({ data }: AccountTrendChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 데이터가 0인 경우 이전 값으로 채우기 (forward fill)
  const displayData = data.map((item, index) => {
    const result = { ...item };

    if (result.totalAccount === 0 && index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        if (data[i]?.totalAccount !== 0) {
          result.totalAccount = data[i]?.totalAccount || 0;
          break;
        }
      }
    }

    if (result.cumulativeDeposit === 0 && index > 0) {
      for (let i = index - 1; i >= 0; i--) {
        if (data[i]?.cumulativeDeposit !== 0) {
          result.cumulativeDeposit = data[i]?.cumulativeDeposit || 0;
          break;
        }
      }
    }

    return result;
  });

  // 현재 날짜에 해당하는 위치로 스크롤
  useEffect(() => {
    if (scrollRef.current && displayData.length > 0) {
      const now = new Date();
      const currentYY = String(now.getFullYear()).slice(2);
      const currentMM = String(now.getMonth() + 1).padStart(2, '0');
      const currentDate = `${currentYY}.${currentMM}`;

      let targetIndex = displayData.length - 1;
      for (let i = 0; i < displayData.length; i++) {
        if (displayData[i] && displayData[i].date >= currentDate) {
          targetIndex = i;
          break;
        }
      }

      const scrollPosition = Math.max(0, targetIndex * 40 - scrollRef.current.clientWidth / 2);
      scrollRef.current.scrollLeft = scrollPosition;
    }
  }, [displayData]);

  // Y축 범위 계산
  const allValues = displayData.flatMap(d => [d.cumulativeDeposit, d.totalAccount]);
  const maxValue = Math.max(...allValues);
  const yMax = Math.ceil(maxValue / 10000000) * 10000000 + 5000000;

  // 차트 너비 계산 (데이터 포인트당 40px)
  const chartWidth = Math.max(displayData.length * 40, 400);

  // 최신 데이터에서 현재 값 추출
  const latestData = displayData[displayData.length - 1];
  const currentDeposit = latestData?.cumulativeDeposit || 0;
  const currentAccount = latestData?.totalAccount || 0;
  const profit = currentAccount - currentDeposit;
  const profitPercent = currentDeposit > 0 ? ((currentAccount - currentDeposit) / currentDeposit) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header with current values */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white mb-1">월별 계좌추세</h4>
            <LandscapeChartModal title="월별 계좌추세">
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={displayData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="depositGradientModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="accountGradientModal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb7185" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#fb7185" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
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
                        backgroundColor: '#1e293b',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        padding: '12px',
                      }}
                      labelStyle={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}
                      formatter={(value: number, name: string) => {
                        const label = name === 'cumulativeDeposit' ? '누적입금액' : '계좌총액';
                        return [`₩${value.toLocaleString()}`, label];
                      }}
                      labelFormatter={(label) => `20${label.replace('.', '년 ')}월`}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeDeposit"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#depositGradientModal)"
                      dot={false}
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#020617', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="totalAccount"
                      stroke="#fb7185"
                      strokeWidth={2}
                      fill="url(#accountGradientModal)"
                      dot={false}
                      activeDot={{ r: 6, fill: '#fb7185', stroke: '#020617', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </LandscapeChartModal>
          </div>
          <p className="text-xs text-slate-500">누적입금액 vs 계좌총액</p>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
            </span>
            <span className="text-xs text-slate-500">원</span>
          </div>
          <span className={`text-xs ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-500/70" />
          <span className="text-[11px] text-slate-400">누적입금액</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-400/70" />
          <span className="text-[11px] text-slate-400">계좌총액</span>
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
          <AreaChart
            data={displayData}
            width={chartWidth}
            height={220}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <defs>
              <linearGradient id="depositGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="accountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0.1} />
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
                backgroundColor: '#1e293b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                padding: '12px',
              }}
              labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 8 }}
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
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#depositGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#3b82f6',
                stroke: '#020617',
                strokeWidth: 2,
              }}
            />
            {/* 계좌총액 (위 레이어) */}
            <Area
              type="monotone"
              dataKey="totalAccount"
              stroke="#fb7185"
              strokeWidth={2}
              fill="url(#accountGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#fb7185',
                stroke: '#020617',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </div>
      </div>

      {/* Scroll hint */}
      {displayData.length > 12 && (
        <p className="text-[10px] text-slate-600 text-center">
          ← 좌우로 스크롤하여 전체 기간 보기 →
        </p>
      )}
    </div>
  );
}

