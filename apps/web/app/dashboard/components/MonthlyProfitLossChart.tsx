'use client';

import { useRef } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LandscapeChartModal } from './LandscapeChartModal';
import { ShareChartButton } from './ShareChartButton';

interface MonthlyProfitLoss {
  month: string;
  profit: number;
  loss: number;
}

interface MonthlyProfitLossChartProps {
  data: MonthlyProfitLoss[];
  variant?: 'default' | 'landing';
}

function formatCurrencyShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}억`;
  if (abs >= 10000) return `${sign}${Math.round(abs / 10000)}만`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(0)}K`;
  return `${sign}${abs}`;
}

function formatYAxisValue(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

// 폭포 차트 데이터 생성
function buildWaterfallData(data: MonthlyProfitLoss[]) {
  let cumulative = 0;
  const result = data.map(d => {
    const net = d.profit - d.loss;
    const base = net >= 0 ? cumulative : cumulative + net;
    const value = Math.abs(net);
    const entry = {
      month: d.month,
      base,
      value,
      net,
      profit: d.profit,
      loss: d.loss,
      cumulative: cumulative + net,
      isTotal: false,
    };
    cumulative += net;
    return entry;
  });

  // 소계 바 추가
  result.push({
    month: '소계',
    base: 0,
    value: Math.abs(cumulative),
    net: cumulative,
    profit: data.reduce((s, d) => s + d.profit, 0),
    loss: data.reduce((s, d) => s + d.loss, 0),
    cumulative,
    isTotal: true,
  });

  return result;
}

export function MonthlyProfitLossChart({ data, variant = 'default' }: MonthlyProfitLossChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) return null;

  const waterfallData = buildWaterfallData(data);

  const totalProfit = data.reduce((sum, d) => sum + d.profit, 0);
  const totalLoss = data.reduce((sum, d) => sum + d.loss, 0);
  const netTotal = totalProfit - totalLoss;

  // Y축 범위
  const allTops = waterfallData.map(d => d.base + d.value);
  const allBottoms = waterfallData.map(d => d.base);
  const yMax = Math.ceil(Math.max(...allTops) * 1.15);
  const yMin = Math.floor(Math.min(...allBottoms, 0) * 1.15);

  const profitColor = variant === 'landing' ? '#059669' : '#ef4444';
  const lossColor = '#3b82f6';
  const totalColor = '#94a3b8';
  const profitText = variant === 'landing' ? 'text-emerald-600' : 'text-red-500';
  const profitBg = variant === 'landing' ? 'bg-emerald-500' : 'bg-red-500';

  // 커스텀 레이블 (바 위에 금액 표시)
  const renderLabel = (fontSize: number) => (props: any) => {
    const { x, y, width, index } = props;
    const entry = waterfallData[index];
    if (!entry) return null;
    const labelY = entry.net >= 0 ? y - 4 : y + entry.value + 12;
    const color = entry.isTotal ? '#64748b' : entry.net >= 0 ? profitColor : lossColor;
    return (
      <text x={x + width / 2} y={labelY} fill={color} textAnchor="middle" fontSize={fontSize} fontWeight={600}>
        {formatCurrencyShort(entry.net)}
      </text>
    );
  };

  const renderWaterfallChart = (height: string | number = '240px', isModal = false, isCapture = false) => {
    const labelFontSize = isModal ? 10 : isCapture ? 11 : 8;
    const xFontSize = isModal ? 11 : isCapture ? 12 : 9;
    const margin = isModal
      ? { top: 24, right: 20, left: 10, bottom: 5 }
      : isCapture
        ? { top: 28, right: 30, left: 10, bottom: 10 }
        : { top: 20, right: 5, left: -5, bottom: 5 };

    return (
      <div className="relative w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfallData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: xFontSize }}
              tickFormatter={(v) => v === '소계' ? '소계' : v.replace('월', '')}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickFormatter={formatYAxisValue}
              domain={[yMin, yMax]}
              width={isCapture ? 50 : isModal ? 45 : 40}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
            {!isCapture && (
              <Tooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const entry = waterfallData.find(d => d.month === label);
                  if (!entry) return null;
                  return (
                    <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-xl">
                      <p className="text-muted-foreground text-[10px] mb-1">{entry.isTotal ? '소계' : label}</p>
                      {!entry.isTotal && entry.profit > 0 && (
                        <p className="text-xs font-medium" style={{ color: profitColor }}>수익: +{entry.profit.toLocaleString()}원</p>
                      )}
                      {!entry.isTotal && entry.loss > 0 && (
                        <p className="text-xs font-medium" style={{ color: lossColor }}>손실: -{entry.loss.toLocaleString()}원</p>
                      )}
                      <div className="border-t border-border mt-1 pt-1">
                        <p className="text-sm font-bold" style={{ color: entry.net >= 0 ? profitColor : lossColor }}>
                          {entry.isTotal ? '합계' : '순손익'}: {entry.net >= 0 ? '+' : ''}{entry.net.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
            )}
            {/* 투명 베이스 바 */}
            <Bar dataKey="base" stackId="waterfall" fill="transparent" radius={0} maxBarSize={isModal ? 32 : isCapture ? 36 : 22} isAnimationActive={!isCapture} />
            {/* 실제 보이는 바 */}
            <Bar dataKey="value" stackId="waterfall" radius={[3, 3, 3, 3]} maxBarSize={isModal ? 32 : isCapture ? 36 : 22} isAnimationActive={!isCapture}>
              <LabelList dataKey="value" position="top" content={renderLabel(labelFontSize)} />
              {waterfallData.map((entry) => (
                <Cell
                  key={entry.month}
                  fill={entry.isTotal ? totalColor : entry.net >= 0 ? profitColor : lossColor}
                  opacity={entry.isTotal ? 0.6 : 0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">월별 손익</h4>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 mr-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${profitBg}`} />
              <span className="text-[10px] text-muted-foreground">수익</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">손실</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-sm bg-slate-400/60" />
              <span className="text-[10px] text-muted-foreground">소계</span>
            </div>
          </div>
          {variant === 'default' && (
            <>
              <ShareChartButton chartRef={hiddenChartRef} title="월별 손익" />
              <LandscapeChartModal title="월별 손익">
                <div className="flex flex-col w-full h-full">
                  <div className="flex items-center justify-center gap-5 mb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${profitBg}`} />
                      <span className="text-xs text-muted-foreground">수익</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-blue-500" />
                      <span className="text-xs text-muted-foreground">손실</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-slate-400/60" />
                      <span className="text-xs text-muted-foreground">소계</span>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    {renderWaterfallChart('100%', true)}
                  </div>
                </div>
              </LandscapeChartModal>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">총 수익</span>
            <span className={`text-xs sm:text-sm font-bold ${profitText}`}>
              +{totalProfit.toLocaleString()}원
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block mb-1">총 손실</span>
            <span className="text-xs sm:text-sm font-bold text-blue-500">
              -{totalLoss.toLocaleString()}원
            </span>
          </div>
        </div>
        <div className="pt-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground block mb-1">순손익</span>
          <span className={`text-xl font-bold ${netTotal >= 0 ? profitText : 'text-blue-500'}`}>
            {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* Chart */}
      {renderWaterfallChart()}

      {/* Hidden Chart for Capture */}
      {variant === 'default' && (
        <div
          ref={hiddenChartRef}
          style={{
            position: 'fixed', top: 0, left: 0, zIndex: -50, opacity: 0,
            width: '800px', height: '450px', backgroundColor: '#ffffff', padding: '20px', pointerEvents: 'none',
          }}
        >
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>월별 손익</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>순손익 {netTotal >= 0 ? '+' : ''}{netTotal.toLocaleString()}원</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: profitColor }} />
              <span style={{ fontSize: '14px', color: '#64748b' }}>수익</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: lossColor }} />
              <span style={{ fontSize: '14px', color: '#64748b' }}>손실</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '2px', backgroundColor: totalColor, opacity: 0.6 }} />
              <span style={{ fontSize: '14px', color: '#64748b' }}>소계</span>
            </div>
          </div>
          <div style={{ width: '100%', height: '350px' }}>
            {renderWaterfallChart('100%', false, true)}
          </div>
        </div>
      )}
    </div>
  );
}
