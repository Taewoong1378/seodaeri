"use client";

import { useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  YieldComparisonData,
  YieldComparisonDollarData,
} from "../../../lib/google-sheets";
import { LandscapeChartModal } from "./LandscapeChartModal";
import { ShareChartButton } from "./ShareChartButton";

type ViewMode = "krw" | "dollar" | "compare";

interface YieldComparisonChartProps {
  data: YieldComparisonData;
  dollarData?: YieldComparisonDollarData | null;
}

const COLORS = {
  thisYear: "#3b82f6", // blue
  annualized: "#ef4444", // red
};

// 바 차트 데이터 생성 (원화)
function buildKrwChartData(data: YieldComparisonData) {
  return [
    {
      name: "계좌",
      thisYear: data.thisYearYield.account,
      annualized: data.annualizedYield.account,
    },
    {
      name: "KOSPI",
      thisYear: data.thisYearYield.kospi,
      annualized: data.annualizedYield.kospi,
    },
    {
      name: "S&P500",
      thisYear: data.thisYearYield.sp500,
      annualized: data.annualizedYield.sp500,
    },
    {
      name: "NASDAQ",
      thisYear: data.thisYearYield.nasdaq,
      annualized: data.annualizedYield.nasdaq,
    },
  ];
}

// 바 차트 데이터 생성 (달러환율)
function buildDollarChartData(data: YieldComparisonDollarData) {
  return [
    {
      name: "계좌",
      thisYear: data.thisYearYield.account,
      annualized: data.annualizedYield.account,
    },
    {
      name: "KOSPI",
      thisYear: data.thisYearYield.kospi,
      annualized: data.annualizedYield.kospi,
    },
    {
      name: "S&P500",
      thisYear: data.thisYearYield.sp500,
      annualized: data.annualizedYield.sp500,
    },
    {
      name: "NASDAQ",
      thisYear: data.thisYearYield.nasdaq,
      annualized: data.annualizedYield.nasdaq,
    },
    {
      name: "DOLLAR",
      thisYear: data.thisYearYield.dollar,
      annualized: data.annualizedYield.dollar,
    },
  ];
}

// 바 색상 결정
const getBarColor = (value: number, baseColor: string) => {
  return value >= 0 ? baseColor : "#94a3b8";
};

// 데이터 레이블 포맷
const formatLabel = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

// 커스텀 레이블 렌더러
const renderBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (value === undefined || value === null) return null;
  return (
    <text
      x={x + width / 2}
      y={value >= 0 ? y - 4 : y + 16}
      fill="#64748b"
      textAnchor="middle"
      fontSize={9}
      fontWeight={600}
    >
      {formatLabel(value)}
    </text>
  );
};

// 공유 바 차트 컴포넌트
function YieldBarChart({
  chartData,
  height = "100%",
  showYAxis = false,
  showTooltip = true,
  fontSize: fontSizeProp,
  labelFontSize: labelFontSizeProp,
  margin,
}: {
  chartData: { name: string; thisYear: number; annualized: number }[];
  height?: string | number;
  showYAxis?: boolean;
  showTooltip?: boolean;
  fontSize?: number;
  labelFontSize?: number;
  margin?: { top: number; right: number; left: number; bottom: number };
}) {
  const isCramped = chartData.length >= 5;
  const fontSize = fontSizeProp ?? (isCramped ? 9 : 11);
  const labelFontSize = labelFontSizeProp ?? (isCramped ? 8 : 9);
  const defaultMargin = margin || {
    top: 20,
    right: isCramped ? 16 : 10,
    left: showYAxis ? 10 : isCramped ? 4 : -10,
    bottom: 0,
  };

  // 레이블 렌더러: 같은 높이에 표시
  const makeLabelRenderer = (color: string) => (props: any) => {
    const { x, y, width, value } = props;
    if (value === undefined || value === null) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill={color}
        textAnchor="middle"
        fontSize={labelFontSize}
        fontWeight={600}
      >
        {formatLabel(value)}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height as number | `${number}%`}>
      <BarChart
        data={chartData}
        margin={defaultMargin}
        barCategoryGap={isCramped ? "15%" : "20%"}
        barGap={isCramped ? 8 : 10}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e2e8f0"
          vertical={false}
        />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <XAxis
          dataKey="name"
          axisLine={{ stroke: "#cbd5e1" }}
          tickLine={false}
          tick={{ fill: "#64748b", fontSize }}
          dy={4}
        />
        {showYAxis ? (
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
        ) : (
          <YAxis hide />
        )}
        {showTooltip && (
          <Tooltip
            cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                    padding: "14px 16px",
                  }}
                >
                  <p style={{ color: "#64748b", fontSize: 11, margin: "0 0 10px 0" }}>{label}</p>
                  {payload.map((entry: any) => {
                    const name = entry.dataKey === "thisYear" ? "올해 수익률" : "연평균 수익률";
                    const value = entry.value as number;
                    const color = entry.dataKey === "thisYear" ? COLORS.thisYear : COLORS.annualized;
                    return (
                      <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
                        <span style={{ color: "#64748b", fontSize: 12 }}>{name}</span>
                        <span style={{ color: "#1e293b", fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
                          {value >= 0 ? "+" : ""}{value.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            }}
          />
        )}
        <Bar
          dataKey="thisYear"
          fill={COLORS.thisYear}
          radius={[4, 4, 0, 0]}
          maxBarSize={isCramped ? 28 : 40}
        >
          <LabelList
            dataKey="thisYear"
            position="top"
            content={makeLabelRenderer(COLORS.thisYear)}
          />
          {chartData.map((entry) => (
            <Cell
              key={`thisYear-${entry.name}`}
              fill={getBarColor(entry.thisYear, COLORS.thisYear)}
            />
          ))}
        </Bar>
        <Bar
          dataKey="annualized"
          fill={COLORS.annualized}
          radius={[4, 4, 0, 0]}
          maxBarSize={isCramped ? 28 : 40}
        >
          <LabelList
            dataKey="annualized"
            position="top"
            content={makeLabelRenderer(COLORS.annualized)}
          />
          {chartData.map((entry) => (
            <Cell
              key={`annualized-${entry.name}`}
              fill={getBarColor(entry.annualized, COLORS.annualized)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 탭 라벨
const TAB_LABELS: Record<ViewMode, string> = {
  krw: "원화",
  dollar: "달러환율",
  compare: "비교",
};

export function YieldComparisonChart({
  data,
  dollarData,
}: YieldComparisonChartProps) {
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const hasDollar = !!dollarData;
  const [viewMode, setViewMode] = useState<ViewMode>("krw");

  const krwChartData = buildKrwChartData(data);
  const dollarChartData = dollarData ? buildDollarChartData(dollarData) : [];

  const currentChartData =
    viewMode === "dollar" ? dollarChartData : krwChartData;
  const currentTitle =
    viewMode === "compare"
      ? "수익률 비교 (원화 vs 달러환율)"
      : viewMode === "dollar"
        ? "수익률 비교 (달러환율 적용)"
        : "수익률 비교";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">수익률 비교</h4>
          <div className="flex items-center gap-2">
            <ShareChartButton chartRef={hiddenChartRef} title={currentTitle} />
            <LandscapeChartModal title={currentTitle}>
              <div className="flex flex-col w-full h-full">
                {/* 모달 상단: 탭 + 레전드 한 줄 */}
                <div className="flex items-center justify-between mb-2 shrink-0">
                  {hasDollar ? (
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                      {(Object.keys(TAB_LABELS) as ViewMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setViewMode(mode)}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                            viewMode === mode
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {TAB_LABELS[mode]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.thisYear }} />
                      <span className="text-xs text-muted-foreground">올해 수익률</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.annualized }} />
                      <span className="text-xs text-muted-foreground">연평균 수익률</span>
                    </div>
                  </div>
                </div>

                {/* 모달 차트 */}
                <div className="flex-1 min-h-0">
                  {viewMode === "compare" && hasDollar ? (
                    <div className="flex gap-6 h-full">
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-xs font-medium text-muted-foreground mb-1 ml-1">원화 기준</span>
                        <div className="flex-1">
                          <YieldBarChart
                            chartData={krwChartData}
                            fontSize={12}
                            labelFontSize={10}
                            margin={{ top: 24, right: 10, left: -10, bottom: 0 }}
                          />
                        </div>
                      </div>
                      <div className="w-px bg-border shrink-0" />
                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-xs font-medium text-muted-foreground mb-1 ml-1">달러환율 적용</span>
                        <div className="flex-1">
                          <YieldBarChart
                            chartData={dollarChartData}
                            fontSize={12}
                            labelFontSize={10}
                            margin={{ top: 24, right: 10, left: -10, bottom: 0 }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <YieldBarChart
                      chartData={viewMode === "dollar" ? dollarChartData : krwChartData}
                      showYAxis
                      fontSize={14}
                      labelFontSize={12}
                      margin={{ top: 28, right: 30, left: 10, bottom: 10 }}
                    />
                  )}
                </div>
              </div>
            </LandscapeChartModal>
          </div>
        </div>

        {/* 탭 + 레전드 */}
        <div className="flex items-center justify-between">
          {/* 탭 */}
          {hasDollar ? (
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              {(Object.keys(TAB_LABELS) as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                    viewMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {TAB_LABELS[mode]}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

          {/* 레전드 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: COLORS.thisYear }}
              />
              <span className="text-[10px] text-muted-foreground">
                누적 수익률
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: COLORS.annualized }}
              />
              <span className="text-[10px] text-muted-foreground">
                연평균 수익률
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {viewMode === "compare" && hasDollar ? (
        <div className="space-y-3">
          <div>
            <span className="text-[10px] text-muted-foreground ml-1">
              원화 기준
            </span>
            <div className="h-[200px]">
              <YieldBarChart chartData={krwChartData} />
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground ml-1">
              달러환율 적용
            </span>
            <div className="h-[220px]">
              <YieldBarChart chartData={dollarChartData} />
            </div>
          </div>
        </div>
      ) : (
        <div className={viewMode === "dollar" ? "h-[260px]" : "h-[240px]"}>
          <YieldBarChart chartData={currentChartData} />
        </div>
      )}

      {/* Summary Cards */}
      <div
        className={`grid gap-2 ${
          currentChartData.length > 4 ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {currentChartData.map((item) => (
          <div
            key={item.name}
            className="bg-muted/30 border border-border rounded-xl px-2 py-2.5 text-center"
          >
            <span className="text-[9px] text-muted-foreground block mb-1 truncate">
              {item.name}
            </span>
            <div className="space-y-0.5">
              <div
                className={`text-[11px] font-bold leading-tight ${
                  item.thisYear >= 0 ? "text-blue-500" : "text-muted-foreground"
                }`}
              >
                {item.thisYear >= 0 ? "+" : ""}
                {item.thisYear.toFixed(1)}%
              </div>
              <div
                className={`text-[9px] leading-tight ${
                  item.annualized >= 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                연평균 {item.annualized >= 0 ? "+" : ""}
                {item.annualized.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hidden Chart for Capture - 인라인 스타일 (html-to-image 호환) */}
      <div
        ref={hiddenChartRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -50,
          opacity: 0,
          width: viewMode === "compare" ? "900px" : "800px",
          height: "450px",
          backgroundColor: "#ffffff",
          padding: "20px",
          pointerEvents: "none",
        }}
      >
        {/* 헤더 */}
        <div style={{ marginBottom: "12px" }}>
          <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {currentTitle}
          </h3>
        </div>
        {/* 레전드 */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "2px", backgroundColor: COLORS.thisYear }} />
            <span style={{ fontSize: "13px", color: "#64748b" }}>올해 수익률</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "2px", backgroundColor: COLORS.annualized }} />
            <span style={{ fontSize: "13px", color: "#64748b" }}>연평균 수익률</span>
          </div>
        </div>
        {/* 차트 */}
        {viewMode === "compare" && hasDollar ? (
          <div style={{ display: "flex", gap: "20px", width: "100%", height: "360px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>원화 기준</span>
              <div style={{ flex: 1 }}>
                <YieldBarChart
                  chartData={krwChartData}
                  showYAxis
                  showTooltip={false}
                  fontSize={13}
                  labelFontSize={11}
                  margin={{ top: 28, right: 10, left: 10, bottom: 10 }}
                />
              </div>
            </div>
            <div style={{ width: "1px", backgroundColor: "#e2e8f0" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>달러환율 적용</span>
              <div style={{ flex: 1 }}>
                <YieldBarChart
                  chartData={dollarChartData}
                  showYAxis
                  showTooltip={false}
                  fontSize={13}
                  labelFontSize={11}
                  margin={{ top: 28, right: 10, left: 10, bottom: 10 }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: "100%", height: "360px" }}>
            <YieldBarChart
              chartData={currentChartData}
              showYAxis
              showTooltip={false}
              fontSize={14}
              labelFontSize={13}
              margin={{ top: 32, right: 30, left: 10, bottom: 20 }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
