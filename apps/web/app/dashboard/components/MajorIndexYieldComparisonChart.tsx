'use client';

import { useRef, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MajorIndexYieldComparisonData } from '../../../lib/google-sheets';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface MajorIndexYieldComparisonChartProps {
  data: MajorIndexYieldComparisonData;
}

type IndexKey = 'kospi' | 'sp500' | 'nasdaq';

const INDEX_OPTIONS: { key: IndexKey; label: string; color: string }[] = [
  { key: 'kospi', label: 'KOSPI', color: '#3b82f6' },
  { key: 'sp500', label: 'S&P500', color: '#ef4444' },
  { key: 'nasdaq', label: 'NASDAQ', color: '#9ca3af' },
];

const COLORS = {
  sp500: '#ef4444',
  nasdaq: '#9ca3af',
  kospi: '#3b82f6',
  account: '#22c55e',
};

export function MajorIndexYieldComparisonChart({ data }: MajorIndexYieldComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<IndexKey>('kospi');
  const [showSelector, setShowSelector] = useState(false);

  const selectedOption = INDEX_OPTIONS.find(o => o.key === selectedIndex)!;

  // 라인 차트 데이터 변환
  const chartData = data.months.map((month, idx) => ({
    name: month,
    sp500: data.sp500[idx],
    nasdaq: data.nasdaq[idx],
    kospi: data.kospi[idx],
    account: data.account[idx],
  }));

  const currentYear = new Date().getFullYear();

  // Y축 범위 계산
  const accountValues = data.account.filter((v): v is number => v !== null);
  const allValues = [...data.sp500, ...data.nasdaq, ...data.kospi, ...accountValues];
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const yMin = Math.floor(minValue / 25) * 25 - 25;
  const yMax = Math.ceil(maxValue / 25) * 25 + 25;

  // 카드뷰용 Y축 (선택 지수 + account만)
  const selectedValues = data[selectedIndex];
  const cardAllValues = [...selectedValues, ...accountValues];
  const cardMin = Math.min(...cardAllValues);
  const cardMax = Math.max(...cardAllValues);
  const cardYMin = Math.floor(cardMin / 10) * 10 - 10;
  const cardYMax = Math.ceil(cardMax / 10) * 10 + 10;

  // 현재 값 (마지막 데이터)
  const latestIdx = data.months.length - 1;
  const lastValidAccountIdx = data.account.reduce<number>((lastIdx, val, idx) => val !== null ? idx : lastIdx, 0);
  const lastValidAccountValue = data.account[lastValidAccountIdx];

  // 카드뷰 차트 (account + 선택된 지수 1개)
  const renderCardChart = () => (
    <LineChart
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
        interval="preserveStartEnd"
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: 10 }}
        tickFormatter={(value) => `${value}%`}
        domain={[cardYMin, cardYMax]}
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
          const labels: Record<string, string> = {
            sp500: 'S&P500', nasdaq: 'NASDAQ', kospi: 'KOSPI', account: '내 투자',
          };
          return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, labels[name] || name];
        }}
      />
      <Line
        type="monotone"
        dataKey="account"
        stroke={COLORS.account}
        strokeWidth={2.5}
        dot={false}
        activeDot={{ r: 5, fill: COLORS.account, stroke: '#ffffff', strokeWidth: 2 }}
        name="account"
      />
      <Line
        type="monotone"
        dataKey={selectedIndex}
        stroke={selectedOption.color}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={false}
        activeDot={{ r: 5, fill: selectedOption.color, stroke: '#ffffff', strokeWidth: 2 }}
        name={selectedIndex}
      />
    </LineChart>
  );

  // 전체화면 차트 (전체 지수)
  const renderFullChart = () => (
    <LineChart
      data={chartData}
      margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <ReferenceLine y={0} stroke="#cbd5e1" />
      <XAxis
        dataKey="name"
        axisLine={{ stroke: '#cbd5e1' }}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: 12 }}
        interval={0}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: '#64748b', fontSize: 12 }}
        tickFormatter={(value) => `${value}%`}
        domain={[yMin, yMax]}
        width={50}
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
          const labels: Record<string, string> = {
            sp500: 'S&P500', nasdaq: 'NASDAQ', kospi: 'KOSPI', account: '내 투자',
          };
          return [`${value >= 0 ? '+' : ''}${value.toFixed(1)}%`, labels[name] || name];
        }}
      />
      <Line type="monotone" dataKey="account" stroke={COLORS.account} strokeWidth={2.5} dot={{ fill: COLORS.account, strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} name="account" />
      <Line type="monotone" dataKey="sp500" stroke={COLORS.sp500} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: COLORS.sp500, strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} name="sp500" />
      <Line type="monotone" dataKey="nasdaq" stroke={COLORS.nasdaq} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: COLORS.nasdaq, strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} name="nasdaq" />
      <Line type="monotone" dataKey="kospi" stroke={COLORS.kospi} strokeWidth={2} strokeDasharray="5 5" dot={{ fill: COLORS.kospi, strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} name="kospi" />
    </LineChart>
  );

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">누적 수익률</h4>
          <div className="flex items-center gap-2">
            <ShareChartButton chartRef={hiddenChartRef} title={`${currentYear}년 주요지수 수익률 비교`} />
            <LandscapeChartModal title={`${currentYear}년 주요지수 수익률 비교`}>
              <div className="flex flex-col w-full h-full">
                {/* 모달 레전드 */}
                <div className="flex items-center justify-center gap-5 mb-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-1 rounded" style={{ backgroundColor: COLORS.account }} />
                    <span className="text-xs text-muted-foreground">내 투자</span>
                  </div>
                  {INDEX_OPTIONS.map(opt => (
                    <div key={opt.key} className="flex items-center gap-1.5">
                      <div className="w-4 h-0.5 rounded" style={{ backgroundColor: opt.color }} />
                      <span className="text-xs text-muted-foreground">{opt.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    {renderFullChart()}
                  </ResponsiveContainer>
                </div>
              </div>
            </LandscapeChartModal>
          </div>
        </div>

        {/* 비교지수 선택 + 레전드 */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors"
            >
              <span>vs {selectedOption.label}</span>
              <svg className={`w-3 h-3 transition-transform ${showSelector ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <title>펼치기</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSelector(false)} onKeyDown={() => {}} />
                <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                  {INDEX_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setSelectedIndex(opt.key); setShowSelector(false); }}
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

          {/* 카드뷰 레전드 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1 rounded" style={{ backgroundColor: COLORS.account }} />
              <span className="text-[10px] text-muted-foreground">내 투자</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: selectedOption.color }} />
              <span className="text-[10px] text-muted-foreground">{selectedOption.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Chart - account + 선택한 지수 1개만 */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderCardChart()}
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
          <span className="text-[9px] text-muted-foreground block mb-0.5">내 투자</span>
          {lastValidAccountValue != null ? (
            <div className={`text-sm font-bold ${lastValidAccountValue >= 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
              {lastValidAccountValue >= 0 ? '+' : ''}{lastValidAccountValue.toFixed(1)}%
            </div>
          ) : (
            <div className="text-sm font-bold text-muted-foreground">-</div>
          )}
        </div>
        <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
          <span className="text-[9px] text-muted-foreground block mb-0.5">{selectedOption.label}</span>
          {data[selectedIndex][latestIdx] !== undefined ? (
            <div className={`text-sm font-bold ${(data[selectedIndex][latestIdx] ?? 0) >= 0 ? 'text-blue-500' : 'text-muted-foreground'}`} style={{ color: selectedOption.color }}>
              {(data[selectedIndex][latestIdx] ?? 0) >= 0 ? '+' : ''}{(data[selectedIndex][latestIdx] ?? 0).toFixed(1)}%
            </div>
          ) : (
            <div className="text-sm font-bold text-muted-foreground">-</div>
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
          backgroundColor: '#ffffff',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{currentYear}년 주요지수 수익률 비교</h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>vs S&P500, NASDAQ, KOSPI</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '16px', height: '3px', borderRadius: '2px', backgroundColor: COLORS.account }} />
            <span style={{ fontSize: '14px', color: '#64748b' }}>내 투자</span>
          </div>
          {INDEX_OPTIONS.map(opt => (
            <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '2px', borderRadius: '2px', backgroundColor: opt.color }} />
              <span style={{ fontSize: '14px', color: '#64748b' }}>{opt.label}</span>
            </div>
          ))}
        </div>
        <div style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderFullChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
