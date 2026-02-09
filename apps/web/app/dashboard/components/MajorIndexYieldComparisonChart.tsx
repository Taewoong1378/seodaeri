"use client";

import { useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MajorIndexYieldComparisonData } from "../../../lib/google-sheets";
import { LandscapeChartModal } from "./LandscapeChartModal";
import { ShareChartButton } from "./ShareChartButton";

interface MajorIndexYieldComparisonChartProps {
  data: MajorIndexYieldComparisonData;
}

type IndexKey = "all" | "kospi" | "sp500" | "nasdaq";
type RateMode = "basic" | "dollar";

const INDEX_OPTIONS: { key: IndexKey; label: string; color: string }[] = [
  { key: "all", label: "전체", color: "#6366f1" },
  { key: "kospi", label: "KOSPI", color: "#3b82f6" },
  { key: "sp500", label: "S&P500", color: "#ef4444" },
  { key: "nasdaq", label: "NASDAQ", color: "#9ca3af" },
];

const COLORS = {
  sp500: "#ef4444",
  nasdaq: "#9ca3af",
  kospi: "#3b82f6",
  account: "#22c55e",
  dollar: "#f59e0b",
};

export function MajorIndexYieldComparisonChart({
  data,
}: MajorIndexYieldComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<IndexKey>("all");
  const [showSelector, setShowSelector] = useState(false);
  const [rateMode, setRateMode] = useState<RateMode>("basic");

  const hasDollarData = !!(
    data.sp500Dollar &&
    data.nasdaqDollar &&
    data.dollar
  );
  const selectedOption = INDEX_OPTIONS.find((o) => o.key === selectedIndex)!;
  const currentYear = new Date().getFullYear();

  // 선택 지수의 값 가져오기 (기본/환율에 따라)
  const getIndexValues = (key: Exclude<IndexKey, "all">): number[] => {
    if (rateMode === "dollar" && hasDollarData) {
      if (key === "sp500") return data.sp500Dollar!;
      if (key === "nasdaq") return data.nasdaqDollar!;
    }
    return data[key];
  };

  // 라인 차트 데이터 변환
  const chartData = data.months.map((month, idx) => ({
    name: month,
    sp500:
      rateMode === "dollar" && data.sp500Dollar
        ? data.sp500Dollar[idx]
        : data.sp500[idx],
    nasdaq:
      rateMode === "dollar" && data.nasdaqDollar
        ? data.nasdaqDollar[idx]
        : data.nasdaq[idx],
    kospi: data.kospi[idx],
    account: data.account[idx],
    ...(hasDollarData && rateMode === "dollar"
      ? { dollar: data.dollar![idx] }
      : {}),
  }));

  // Y축 범위 계산 (전체)
  const accountValues = data.account.filter((v): v is number => v !== null);
  const allValuesForRange = [
    ...getIndexValues("sp500"),
    ...getIndexValues("nasdaq"),
    ...data.kospi,
    ...accountValues,
    ...(rateMode === "dollar" && data.dollar ? data.dollar : []),
  ];
  const minValue = Math.min(...allValuesForRange);
  const maxValue = Math.max(...allValuesForRange);
  const yMin = Math.floor(minValue / 25) * 25 - 25;
  const yMax = Math.ceil(maxValue / 25) * 25 + 25;

  // 카드뷰용 Y축 (선택 지수 + account만)
  const cardAllValues = selectedIndex === "all"
    ? allValuesForRange
    : [...getIndexValues(selectedIndex as Exclude<IndexKey, "all">), ...accountValues];
  const cardMin = Math.min(...cardAllValues);
  const cardMax = Math.max(...cardAllValues);
  const cardYMin = Math.floor(cardMin / 10) * 10 - 10;
  const cardYMax = Math.ceil(cardMax / 10) * 10 + 10;

  // 현재 값 (마지막 데이터)
  const latestIdx = data.months.length - 1;
  const lastValidAccountIdx = data.account.reduce<number>(
    (lastIdx, val, idx) => (val !== null ? idx : lastIdx),
    0
  );
  const lastValidAccountValue = data.account[lastValidAccountIdx];
  const selectedLatestValue = selectedIndex === "all" ? 0 : (getIndexValues(selectedIndex)[latestIdx] ?? 0);

  // Tooltip formatter
  const tooltipFormatter = (value: number, name: string) => {
    const labels: Record<string, string> = {
      sp500: "S&P500",
      nasdaq: "NASDAQ",
      kospi: "KOSPI",
      account: "내 투자",
      dollar: "달러환율",
    };
    if (rateMode === "dollar") {
      if (name === "sp500")
        return [`${value >= 0 ? "+" : ""}${value.toFixed(1)}%`, "S&P500(환율)"];
      if (name === "nasdaq")
        return [`${value >= 0 ? "+" : ""}${value.toFixed(1)}%`, "NASDAQ(환율)"];
    }
    return [
      `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
      labels[name] || name,
    ];
  };

  // 카드뷰 차트 (account + 선택된 지수)
  const renderCardChart = () => (
    <LineChart
      data={chartData}
      margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
      <ReferenceLine y={0} stroke="#cbd5e1" />
      <XAxis
        dataKey="name"
        axisLine={{ stroke: "#cbd5e1" }}
        tickLine={false}
        tick={{ fill: "#64748b", fontSize: 10 }}
        interval="preserveStartEnd"
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#64748b", fontSize: 10 }}
        tickFormatter={(v) => `${v}%`}
        domain={[cardYMin, cardYMax]}
        width={45}
      />
      <Tooltip
        cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
        contentStyle={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          padding: "12px",
          color: "#1e293b",
        }}
        labelStyle={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}
        formatter={tooltipFormatter}
      />
      <Line
        type="monotone"
        dataKey="account"
        stroke={COLORS.account}
        strokeWidth={2.5}
        dot={false}
        activeDot={{
          r: 5,
          fill: COLORS.account,
          stroke: "#ffffff",
          strokeWidth: 2,
        }}
        name="account"
      />
      {selectedIndex === "all" ? (
        <>
          <Line type="monotone" dataKey="kospi" stroke={COLORS.kospi} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5, fill: COLORS.kospi, stroke: "#ffffff", strokeWidth: 2 }} name="kospi" />
          <Line type="monotone" dataKey="sp500" stroke={COLORS.sp500} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5, fill: COLORS.sp500, stroke: "#ffffff", strokeWidth: 2 }} name="sp500" />
          <Line type="monotone" dataKey="nasdaq" stroke={COLORS.nasdaq} strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 5, fill: COLORS.nasdaq, stroke: "#ffffff", strokeWidth: 2 }} name="nasdaq" />
          {rateMode === "dollar" && hasDollarData && (
            <Line type="monotone" dataKey="dollar" stroke={COLORS.dollar} strokeWidth={2} strokeDasharray="3 3" dot={false} activeDot={{ r: 5, fill: COLORS.dollar, stroke: "#ffffff", strokeWidth: 2 }} name="dollar" />
          )}
        </>
      ) : (
        <Line
          type="monotone"
          dataKey={selectedIndex}
          stroke={selectedOption.color}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
          activeDot={{
            r: 5,
            fill: selectedOption.color,
            stroke: "#ffffff",
            strokeWidth: 2,
          }}
          name={selectedIndex}
        />
      )}
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
        axisLine={{ stroke: "#cbd5e1" }}
        tickLine={false}
        tick={{ fill: "#64748b", fontSize: 12 }}
        interval={0}
      />
      <YAxis
        axisLine={false}
        tickLine={false}
        tick={{ fill: "#64748b", fontSize: 12 }}
        tickFormatter={(v) => `${v}%`}
        domain={[yMin, yMax]}
        width={50}
      />
      <Tooltip
        cursor={{ fill: "rgba(16, 185, 129, 0.1)" }}
        contentStyle={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
          padding: "12px",
          color: "#1e293b",
        }}
        labelStyle={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}
        formatter={tooltipFormatter}
      />
      <Line
        type="monotone"
        dataKey="account"
        stroke={COLORS.account}
        strokeWidth={2.5}
        dot={{ fill: COLORS.account, strokeWidth: 0, r: 4 }}
        activeDot={{ r: 6 }}
        name="account"
      />
      <Line
        type="monotone"
        dataKey="sp500"
        stroke={COLORS.sp500}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: COLORS.sp500, strokeWidth: 0, r: 3 }}
        activeDot={{ r: 5 }}
        name="sp500"
      />
      <Line
        type="monotone"
        dataKey="nasdaq"
        stroke={COLORS.nasdaq}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: COLORS.nasdaq, strokeWidth: 0, r: 3 }}
        activeDot={{ r: 5 }}
        name="nasdaq"
      />
      <Line
        type="monotone"
        dataKey="kospi"
        stroke={COLORS.kospi}
        strokeWidth={2}
        strokeDasharray="5 5"
        dot={{ fill: COLORS.kospi, strokeWidth: 0, r: 3 }}
        activeDot={{ r: 5 }}
        name="kospi"
      />
      {rateMode === "dollar" && hasDollarData && (
        <Line
          type="monotone"
          dataKey="dollar"
          stroke={COLORS.dollar}
          strokeWidth={2}
          strokeDasharray="3 3"
          dot={{ fill: COLORS.dollar, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5 }}
          name="dollar"
        />
      )}
    </LineChart>
  );

  const rateModeLabel = rateMode === "dollar" ? "환율 적용" : "기본";

  return (
    <div ref={chartRef} className="space-y-4">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            {currentYear}년 주요지수 수익률 비교
          </h4>
          <div className="flex items-center gap-2">
            <ShareChartButton
              chartRef={hiddenChartRef}
              title={`${currentYear}년 주요지수 수익률 비교${selectedIndex !== "all" ? ` vs ${selectedOption.label}` : ""} (${rateModeLabel})`}
            />
            <LandscapeChartModal
              title={`${currentYear}년 주요지수 수익률 비교 (${rateModeLabel})`}
            >
              <div className="flex flex-col w-full h-full">
                {/* 모달 상단: 기본/환율 토글 + 레전드 */}
                <div className="flex items-center justify-between mb-2 shrink-0">
                  {hasDollarData ? (
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setRateMode("basic")}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
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
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                          rateMode === "dollar"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground"
                        }`}
                      >
                        환율 적용
                      </button>
                    </div>
                  ) : (
                    <div />
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-1 rounded"
                        style={{ backgroundColor: COLORS.account }}
                      />
                      <span className="text-xs text-muted-foreground">
                        내 투자
                      </span>
                    </div>
                    {INDEX_OPTIONS.map((opt) => (
                      <div key={opt.key} className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-0.5 rounded"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {opt.label}
                        </span>
                      </div>
                    ))}
                    {rateMode === "dollar" && hasDollarData && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-4 h-0.5 rounded"
                          style={{ backgroundColor: COLORS.dollar }}
                        />
                        <span className="text-xs text-muted-foreground">
                          달러환율
                        </span>
                      </div>
                    )}
                  </div>
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

        {/* 컨트롤: 비교지수 선택 + 기본/환율 토글 */}
        <div className="flex items-center gap-2">
            {/* 비교지수 선택 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSelector(!showSelector)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors"
              >
                <span>{selectedIndex === "all" ? "전체 지수" : `vs ${selectedOption.label}`}</span>
                <svg
                  className={`w-3 h-3 transition-transform ${
                    showSelector ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <title>펼치기</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
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
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-0.5 rounded"
                            style={{ backgroundColor: opt.color }}
                          />
                          <span>{opt.label}</span>
                        </div>
                        {selectedIndex === opt.key && (
                          <svg
                            className="w-3.5 h-3.5 text-blue-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <title>선택됨</title>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 기본/환율 토글 */}
            {hasDollarData && (
              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setRateMode("basic")}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
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
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-all ${
                    rateMode === "dollar"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  }`}
                >
                  환율
                </button>
              </div>
            )}
          </div>

        {/* 카드뷰 레전드 */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-1 rounded"
              style={{ backgroundColor: COLORS.account }}
            />
            <span className="text-[10px] text-muted-foreground">내 투자</span>
          </div>
          {selectedIndex === "all" ? (
            <>
              {INDEX_OPTIONS.filter(o => o.key !== "all").map((opt) => (
                <div key={opt.key} className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: opt.color }} />
                  <span className="text-[10px] text-muted-foreground">{opt.label}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: selectedOption.color }}
              />
              <span className="text-[10px] text-muted-foreground">
                {selectedOption.label}
                {rateMode === "dollar" &&
                (selectedIndex === "sp500" || selectedIndex === "nasdaq")
                  ? "(환율)"
                  : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Chart */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderCardChart()}
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-2 ${selectedIndex === "all" ? "grid-cols-4" : "grid-cols-2"}`}>
        <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
          <span className="text-[9px] text-muted-foreground block mb-0.5">
            내 투자
          </span>
          {lastValidAccountValue != null ? (
            <div
              className={`text-sm font-bold ${
                lastValidAccountValue >= 0
                  ? "text-green-500"
                  : "text-muted-foreground"
              }`}
            >
              {lastValidAccountValue >= 0 ? "+" : ""}
              {lastValidAccountValue.toFixed(1)}%
            </div>
          ) : (
            <div className="text-sm font-bold text-muted-foreground">-</div>
          )}
        </div>
        {selectedIndex === "all" ? (
          INDEX_OPTIONS.filter(o => o.key !== "all").map((opt) => {
            const val = getIndexValues(opt.key as Exclude<IndexKey, "all">)[latestIdx] ?? 0;
            return (
              <div key={opt.key} className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
                <span className="text-[9px] text-muted-foreground block mb-0.5">
                  {opt.label}
                </span>
                <div className="text-sm font-bold" style={{ color: val >= 0 ? opt.color : undefined }}>
                  {val >= 0 ? "+" : ""}{val.toFixed(1)}%
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
            <span className="text-[9px] text-muted-foreground block mb-0.5">
              {selectedOption.label}
              {rateMode === "dollar" &&
              (selectedIndex === "sp500" || selectedIndex === "nasdaq")
                ? " (환율)"
                : ""}
            </span>
            <div
              className="text-sm font-bold"
              style={{
                color:
                  selectedLatestValue >= 0 ? selectedOption.color : undefined,
              }}
            >
              {selectedLatestValue >= 0 ? "+" : ""}
              {selectedLatestValue.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Hidden Chart for Capture - 현재 선택 상태 반영 */}
      <div
        ref={hiddenChartRef}
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
        <div style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
            }}
          >
            {currentYear}년 주요지수 수익률 비교 ({rateModeLabel})
          </h3>
          <p
            style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}
          >
            {selectedIndex === "all"
              ? "vs S&P500, NASDAQ, KOSPI"
              : `vs ${selectedOption.label}`}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "16px",
                height: "3px",
                borderRadius: "2px",
                backgroundColor: COLORS.account,
              }}
            />
            <span style={{ fontSize: "14px", color: "#64748b" }}>내 투자</span>
          </div>
          {selectedIndex === "all" ? (
            INDEX_OPTIONS.filter(o => o.key !== "all").map((opt) => (
              <div
                key={opt.key}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <div
                  style={{
                    width: "16px",
                    height: "2px",
                    borderRadius: "2px",
                    backgroundColor: opt.color,
                  }}
                />
                <span style={{ fontSize: "14px", color: "#64748b" }}>
                  {opt.label}
                </span>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "16px",
                  height: "2px",
                  borderRadius: "2px",
                  backgroundColor: selectedOption.color,
                }}
              />
              <span style={{ fontSize: "14px", color: "#64748b" }}>
                {selectedOption.label}
              </span>
            </div>
          )}
          {rateMode === "dollar" && hasDollarData && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div
                style={{
                  width: "16px",
                  height: "2px",
                  borderRadius: "2px",
                  backgroundColor: COLORS.dollar,
                }}
              />
              <span style={{ fontSize: "14px", color: "#64748b" }}>
                달러환율
              </span>
            </div>
          )}
        </div>
        <div style={{ width: "100%", height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            {selectedIndex === "all" ? renderFullChart() : renderCardChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
