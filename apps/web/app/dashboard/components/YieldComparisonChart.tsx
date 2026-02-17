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

interface YieldComparisonChartProps {
  data: YieldComparisonData;
  dollarData?: YieldComparisonDollarData | null;
}

type RateMode = "basic" | "dollar";

type ChartDatum = {
  name: string;
  value: number | null;
};

// 바 색상: 계좌는 녹색, 나머지는 파란색 계열
const BAR_COLORS: Record<string, string> = {
  "계좌": "#22c55e",
  "KOSPI": "#3b82f6",
  "S&P500": "#ef4444",
  "NASDAQ": "#9ca3af",
  "DOLLAR": "#8b5cf6",
};

const getBarColor = (name: string, value: number | null) => {
  if (value === null) return "transparent";
  if (value < 0) return "#94a3b8";
  return BAR_COLORS[name] || "#3b82f6";
};

// 데이터 레이블 포맷
const formatLabel = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

// 누적수익률 차트 데이터 생성
function buildCumulativeData(
  data: YieldComparisonData,
  dollarData: YieldComparisonDollarData | null | undefined,
  rateMode: RateMode
): ChartDatum[] {
  const isDollar = rateMode === "dollar" && dollarData;
  const source = isDollar ? dollarData.cumulativeYield : data.cumulativeYield;

  const result: ChartDatum[] = [
    { name: "계좌", value: source.account },
    { name: "KOSPI", value: source.kospi },
    { name: "S&P500", value: source.sp500 },
    { name: "NASDAQ", value: source.nasdaq },
  ];

  if (isDollar && dollarData.cumulativeYield.dollar != null) {
    result.push({ name: "DOLLAR", value: dollarData.cumulativeYield.dollar });
  }

  return result;
}

// 연평균 수익률 차트 데이터 생성
function buildAnnualizedData(
  data: YieldComparisonData,
  dollarData: YieldComparisonDollarData | null | undefined,
  rateMode: RateMode
): ChartDatum[] {
  const isDollar = rateMode === "dollar" && dollarData;
  const source = isDollar ? dollarData.annualizedYield : data.annualizedYield;

  const result: ChartDatum[] = [
    { name: "계좌", value: source.account },
    { name: "KOSPI", value: source.kospi },
    { name: "S&P500", value: source.sp500 },
    { name: "NASDAQ", value: source.nasdaq },
  ];

  if (isDollar && dollarData.annualizedYield.dollar != null) {
    result.push({ name: "DOLLAR", value: dollarData.annualizedYield.dollar });
  }

  return result;
}

// 싱글 바 차트 컴포넌트
function SingleBarChart({
  chartData,
  height = "100%",
  showYAxis = false,
  showTooltip = true,
  fontSize: fontSizeProp,
  labelFontSize: labelFontSizeProp,
  margin,
}: {
  chartData: ChartDatum[];
  height?: string | number;
  showYAxis?: boolean;
  showTooltip?: boolean;
  fontSize?: number;
  labelFontSize?: number;
  margin?: { top: number; right: number; left: number; bottom: number };
}) {
  const isCramped = chartData.length >= 5;
  const fontSize = fontSizeProp ?? (isCramped ? 9 : 11);
  const labelFontSize = labelFontSizeProp ?? (isCramped ? 8 : 10);
  const defaultMargin = margin || {
    top: 24,
    right: isCramped ? 16 : 10,
    left: showYAxis ? 10 : isCramped ? 4 : -10,
    bottom: 0,
  };

  const makeLabelRenderer = () => (props: any) => {
    const { x, y, width, value, index } = props;
    if (value === undefined || value === null) return null;
    const entry = chartData[index];
    const color = getBarColor(entry?.name || "", value);
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
        barCategoryGap={isCramped ? "20%" : "25%"}
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
              const entry = payload[0];
              if (!entry || entry.value === null) return null;
              const value = entry.value as number;
              const color = getBarColor(String(label || ""), value);
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
                  <div
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
                    <span
                      style={{
                        color: "#1e293b",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {value >= 0 ? "+" : ""}
                      {value.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            }}
          />
        )}
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          maxBarSize={isCramped ? 36 : 48}
        >
          <LabelList
            dataKey="value"
            position="top"
            content={makeLabelRenderer()}
          />
          {chartData.map((entry) => (
            <Cell
              key={entry.name}
              fill={getBarColor(entry.name, entry.value)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 기본/환율 토글 버튼
function RateModeToggle({
  rateMode,
  setRateMode,
  size = "sm",
}: {
  rateMode: RateMode;
  setRateMode: (mode: RateMode) => void;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? "px-2" : "px-3";
  const py = size === "sm" ? "py-0.5" : "py-1";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
      <button
        type="button"
        onClick={() => setRateMode("basic")}
        className={`${px} ${py} ${text} font-medium rounded-md transition-all ${
          rateMode === "basic"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        }`}
      >
        기본
      </button>
      <button
        type="button"
        onClick={() => setRateMode("dollar")}
        className={`${px} ${py} ${text} font-medium rounded-md transition-all ${
          rateMode === "dollar"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground"
        }`}
      >
        환율
      </button>
    </div>
  );
}

// 캡처용 히든 차트
function HiddenCaptureChart({
  chartRef,
  title,
  chartData,
  rateModeLabel,
}: {
  chartRef: React.RefObject<HTMLDivElement | null>;
  title: string;
  chartData: ChartDatum[];
  rateModeLabel: string;
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
          {title} ({rateModeLabel})
        </h3>
      </div>
      <div style={{ width: "100%", height: "380px" }}>
        <SingleBarChart
          chartData={chartData}
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
  const [rateMode, setRateMode] = useState<RateMode>("basic");
  const chartData = buildCumulativeData(data, dollarData, rateMode);
  const rateModeLabel = rateMode === "dollar" ? "환율 적용" : "기본";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          누적수익률 비교
        </h4>
        <div className="flex items-center gap-2">
          {hasDollar && (
            <RateModeToggle rateMode={rateMode} setRateMode={setRateMode} />
          )}
          <ShareChartButton
            chartRef={hiddenChartRef}
            title={`누적수익률 비교 (${rateModeLabel})`}
          />
          <LandscapeChartModal title={`누적수익률 비교 (${rateModeLabel})`}>
            <div className="flex flex-col w-full h-full">
              <div className="flex items-center justify-between mb-2 shrink-0">
                {hasDollar ? (
                  <RateModeToggle
                    rateMode={rateMode}
                    setRateMode={setRateMode}
                    size="md"
                  />
                ) : (
                  <div />
                )}
              </div>
              <div className="flex-1 min-h-0">
                <SingleBarChart
                  chartData={chartData}
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

      {/* Chart */}
      <div className="h-[240px]">
        <SingleBarChart chartData={chartData} />
      </div>

      {/* Hidden Chart for Capture */}
      <HiddenCaptureChart
        chartRef={hiddenChartRef}
        title="누적수익률 비교"
        chartData={chartData}
        rateModeLabel={rateModeLabel}
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
  const [rateMode, setRateMode] = useState<RateMode>("basic");
  const chartData = buildAnnualizedData(data, dollarData, rateMode);
  const rateModeLabel = rateMode === "dollar" ? "환율 적용" : "기본";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          연평균 수익률 비교
        </h4>
        <div className="flex items-center gap-2">
          {hasDollar && (
            <RateModeToggle rateMode={rateMode} setRateMode={setRateMode} />
          )}
          <ShareChartButton
            chartRef={hiddenChartRef}
            title={`연평균 수익률 비교 (${rateModeLabel})`}
          />
          <LandscapeChartModal title={`연평균 수익률 비교 (${rateModeLabel})`}>
            <div className="flex flex-col w-full h-full">
              <div className="flex items-center justify-between mb-2 shrink-0">
                {hasDollar ? (
                  <RateModeToggle
                    rateMode={rateMode}
                    setRateMode={setRateMode}
                    size="md"
                  />
                ) : (
                  <div />
                )}
              </div>
              <div className="flex-1 min-h-0">
                <SingleBarChart
                  chartData={chartData}
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

      {/* Chart */}
      <div className="h-[240px]">
        <SingleBarChart chartData={chartData} />
      </div>

      {/* Hidden Chart for Capture */}
      <HiddenCaptureChart
        chartRef={hiddenChartRef}
        title="연평균 수익률 비교"
        chartData={chartData}
        rateModeLabel={rateModeLabel}
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
