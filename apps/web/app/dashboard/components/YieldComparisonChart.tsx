"use client";

import { useRef } from "react";
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

interface YieldComparisonChartProps {
  data: YieldComparisonData;
  dollarData?: YieldComparisonDollarData | null;
}

const COLORS = {
  krw: "#ef4444", // red - 원화
  dollar: "#3b82f6", // blue - 달러환율
};

type ChartDatum = {
  name: string;
  krw: number | null;
  dollar: number | null;
};

// 누적수익률 차트 데이터 생성
function buildCumulativeData(
  data: YieldComparisonData,
  dollarData?: YieldComparisonDollarData | null
): ChartDatum[] {
  const base: ChartDatum[] = [
    {
      name: "계좌",
      krw: data.thisYearYield.account,
      dollar: dollarData?.thisYearYield.account ?? null,
    },
    {
      name: "KOSPI",
      krw: data.thisYearYield.kospi,
      dollar: dollarData?.thisYearYield.kospi ?? null,
    },
    {
      name: "S&P500",
      krw: data.thisYearYield.sp500,
      dollar: dollarData?.thisYearYield.sp500 ?? null,
    },
    {
      name: "NASDAQ",
      krw: data.thisYearYield.nasdaq,
      dollar: dollarData?.thisYearYield.nasdaq ?? null,
    },
  ];
  if (dollarData) {
    base.push({
      name: "DOLLAR",
      krw: null,
      dollar: dollarData.thisYearYield.dollar,
    });
  }
  return base;
}

// 연평균 수익률 차트 데이터 생성
function buildAnnualizedData(
  data: YieldComparisonData,
  dollarData?: YieldComparisonDollarData | null
): ChartDatum[] {
  const base: ChartDatum[] = [
    {
      name: "계좌",
      krw: data.annualizedYield.account,
      dollar: dollarData?.annualizedYield.account ?? null,
    },
    {
      name: "KOSPI",
      krw: data.annualizedYield.kospi,
      dollar: dollarData?.annualizedYield.kospi ?? null,
    },
    {
      name: "S&P500",
      krw: data.annualizedYield.sp500,
      dollar: dollarData?.annualizedYield.sp500 ?? null,
    },
    {
      name: "NASDAQ",
      krw: data.annualizedYield.nasdaq,
      dollar: dollarData?.annualizedYield.nasdaq ?? null,
    },
  ];
  if (dollarData) {
    base.push({
      name: "DOLLAR",
      krw: null,
      dollar: dollarData.annualizedYield.dollar,
    });
  }
  return base;
}

// 바 색상 결정
const getBarColor = (value: number | null, baseColor: string) => {
  if (value === null) return "transparent";
  return value >= 0 ? baseColor : "#94a3b8";
};

// 데이터 레이블 포맷
const formatLabel = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

// 공유 바 차트 컴포넌트
function DualBarChart({
  chartData,
  hasDollar,
  height = "100%",
  showYAxis = false,
  showTooltip = true,
  fontSize: fontSizeProp,
  labelFontSize: labelFontSizeProp,
  margin,
}: {
  chartData: ChartDatum[];
  hasDollar: boolean;
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
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: 11,
                      margin: "0 0 10px 0",
                    }}
                  >
                    {label}
                  </p>
                  {payload.map((entry: any) => {
                    if (entry.value === null) return null;
                    const name =
                      entry.dataKey === "krw" ? "원화 기준" : "달러환율 적용";
                    const value = entry.value as number;
                    const color =
                      entry.dataKey === "krw" ? COLORS.krw : COLORS.dollar;
                    return (
                      <div
                        key={entry.dataKey}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "4px 0",
                        }}
                      >
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            backgroundColor: color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: "#64748b", fontSize: 12 }}>
                          {name}
                        </span>
                        <span
                          style={{
                            color: "#1e293b",
                            fontSize: 12,
                            fontWeight: 600,
                            marginLeft: "auto",
                          }}
                        >
                          {value >= 0 ? "+" : ""}
                          {value.toFixed(1)}%
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
          dataKey="krw"
          fill={COLORS.krw}
          radius={[4, 4, 0, 0]}
          maxBarSize={isCramped ? 28 : 40}
        >
          <LabelList
            dataKey="krw"
            position="top"
            content={makeLabelRenderer(COLORS.krw)}
          />
          {chartData.map((entry) => (
            <Cell
              key={`krw-${entry.name}`}
              fill={getBarColor(entry.krw, COLORS.krw)}
            />
          ))}
        </Bar>
        {hasDollar && (
          <Bar
            dataKey="dollar"
            fill={COLORS.dollar}
            radius={[4, 4, 0, 0]}
            maxBarSize={isCramped ? 28 : 40}
          >
            <LabelList
              dataKey="dollar"
              position="top"
              content={makeLabelRenderer(COLORS.dollar)}
            />
            {chartData.map((entry) => (
              <Cell
                key={`dollar-${entry.name}`}
                fill={getBarColor(entry.dollar, COLORS.dollar)}
              />
            ))}
          </Bar>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// 레전드
function ChartLegend({ hasDollar }: { hasDollar: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: COLORS.krw }}
        />
        <span className="text-[10px] text-muted-foreground">원화 기준</span>
      </div>
      {hasDollar && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: COLORS.dollar }}
          />
          <span className="text-[10px] text-muted-foreground">
            달러환율 적용
          </span>
        </div>
      )}
    </div>
  );
}

// 모달 레전드 (인라인 스타일)
function ModalLegend({ hasDollar }: { hasDollar: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: COLORS.krw }}
        />
        <span className="text-xs text-muted-foreground">원화 기준</span>
      </div>
      {hasDollar && (
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.dollar }}
          />
          <span className="text-xs text-muted-foreground">달러환율 적용</span>
        </div>
      )}
    </div>
  );
}

// 캡처용 히든 차트
function HiddenCaptureChart({
  chartRef,
  title,
  chartData,
  hasDollar,
}: {
  chartRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  chartData: ChartDatum[];
  hasDollar: boolean;
}) {
  return (
    <div
      ref={chartRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: -50,
        opacity: 0,
        width: "800px",
        height: "450px",
        backgroundColor: "#ffffff",
        padding: "20px",
        pointerEvents: "none",
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h3
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#1e293b",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "2px",
              backgroundColor: COLORS.krw,
            }}
          />
          <span style={{ fontSize: "13px", color: "#64748b" }}>원화 기준</span>
        </div>
        {hasDollar && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "2px",
                backgroundColor: COLORS.dollar,
              }}
            />
            <span style={{ fontSize: "13px", color: "#64748b" }}>
              달러환율 적용
            </span>
          </div>
        )}
      </div>
      <div style={{ width: "100%", height: "350px" }}>
        <DualBarChart
          chartData={chartData}
          hasDollar={hasDollar}
          showYAxis
          showTooltip={false}
          fontSize={14}
          labelFontSize={13}
          margin={{ top: 32, right: 30, left: 10, bottom: 20 }}
        />
      </div>
    </div>
  );
}

// ===== 누적수익률 비교 차트 =====
export function CumulativeYieldComparisonChart({
  data,
  dollarData,
}: YieldComparisonChartProps) {
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const hasDollar = !!dollarData;
  const chartData = buildCumulativeData(data, dollarData);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          누적수익률 비교
        </h4>
        <div className="flex items-center gap-2">
          <ShareChartButton
            chartRef={hiddenChartRef}
            title="누적수익률 비교"
          />
          <LandscapeChartModal title="누적수익률 비교">
            <div className="flex flex-col w-full h-full">
              <div className="flex items-center justify-end mb-2 shrink-0">
                <ModalLegend hasDollar={hasDollar} />
              </div>
              <div className="flex-1 min-h-0">
                <DualBarChart
                  chartData={chartData}
                  hasDollar={hasDollar}
                  showYAxis
                  fontSize={14}
                  labelFontSize={12}
                  margin={{ top: 28, right: 30, left: 10, bottom: 10 }}
                />
              </div>
            </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end">
        <ChartLegend hasDollar={hasDollar} />
      </div>

      {/* Chart */}
      <div className={hasDollar ? "h-[260px]" : "h-[240px]"}>
        <DualBarChart chartData={chartData} hasDollar={hasDollar} />
      </div>

      {/* Hidden Chart for Capture */}
      <HiddenCaptureChart
        chartRef={hiddenChartRef}
        title="누적수익률 비교"
        chartData={chartData}
        hasDollar={hasDollar}
      />
    </div>
  );
}

// ===== 연평균 수익률 비교 차트 =====
export function AnnualizedYieldComparisonChart({
  data,
  dollarData,
}: YieldComparisonChartProps) {
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const hasDollar = !!dollarData;
  const chartData = buildAnnualizedData(data, dollarData);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          연평균 수익률 비교
        </h4>
        <div className="flex items-center gap-2">
          <ShareChartButton
            chartRef={hiddenChartRef}
            title="연평균 수익률 비교"
          />
          <LandscapeChartModal title="연평균 수익률 비교">
            <div className="flex flex-col w-full h-full">
              <div className="flex items-center justify-end mb-2 shrink-0">
                <ModalLegend hasDollar={hasDollar} />
              </div>
              <div className="flex-1 min-h-0">
                <DualBarChart
                  chartData={chartData}
                  hasDollar={hasDollar}
                  showYAxis
                  fontSize={14}
                  labelFontSize={12}
                  margin={{ top: 28, right: 30, left: 10, bottom: 10 }}
                />
              </div>
            </div>
          </LandscapeChartModal>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end">
        <ChartLegend hasDollar={hasDollar} />
      </div>

      {/* Chart */}
      <div className={hasDollar ? "h-[260px]" : "h-[240px]"}>
        <DualBarChart chartData={chartData} hasDollar={hasDollar} />
      </div>

      {/* Hidden Chart for Capture */}
      <HiddenCaptureChart
        chartRef={hiddenChartRef}
        title="연평균 수익률 비교"
        chartData={chartData}
        hasDollar={hasDollar}
      />
    </div>
  );
}

// 하위 호환성 - 기존 import 유지용
export function YieldComparisonChart({
  data,
  dollarData,
}: YieldComparisonChartProps) {
  return (
    <div className="space-y-6">
      <CumulativeYieldComparisonChart data={data} dollarData={dollarData} />
      <AnnualizedYieldComparisonChart data={data} dollarData={dollarData} />
    </div>
  );
}
