"use client";

import { useEffect, useRef, useState } from "react";
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

type SeriesKey = "kospi" | "sp500" | "nasdaq" | "gold" | "bitcoin" | "dollar" | "realEstate";
type RateMode = "basic" | "dollar";

const SERIES_OPTIONS: { key: SeriesKey; label: string; color: string }[] = [
  { key: "kospi", label: "KOSPI", color: "#3b82f6" },
  { key: "sp500", label: "S&P500", color: "#ef4444" },
  { key: "nasdaq", label: "NASDAQ", color: "#9ca3af" },
  { key: "gold", label: "금", color: "#eab308" },
  { key: "bitcoin", label: "BTC", color: "#f97316" },
  { key: "dollar", label: "달러", color: "#8b5cf6" },
  { key: "realEstate", label: "부동산", color: "#06b6d4" },
];

const COLORS: Record<string, string> = {
  account: "#22c55e",
  kospi: "#3b82f6",
  sp500: "#ef4444",
  nasdaq: "#9ca3af",
  gold: "#eab308",
  bitcoin: "#f97316",
  dollar: "#8b5cf6",
  realEstate: "#06b6d4",
};

const STORAGE_KEY = "major-index-active-series";

function loadSavedSeries(): Set<SeriesKey> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      const validKeys = SERIES_OPTIONS.map(o => o.key);
      const filtered = parsed.filter((k): k is SeriesKey => validKeys.includes(k as SeriesKey));
      if (filtered.length > 0) return new Set(filtered);
    }
  } catch {
    // ignore
  }
  return new Set(["kospi", "sp500", "nasdaq"]);
}

export function MajorIndexYieldComparisonChart({
  data,
}: MajorIndexYieldComparisonChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const hiddenChartRef = useRef<HTMLDivElement>(null);
  const [activeSeries, setActiveSeries] = useState<Set<SeriesKey>>(() => loadSavedSeries());
  const [showSelector, setShowSelector] = useState(false);
  const [rateMode, setRateMode] = useState<RateMode>("basic");

  // localStorage에 선택 지표 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(activeSeries)));
    } catch {
      // ignore
    }
  }, [activeSeries]);

  const hasDollarData = !!(data.sp500Dollar && data.nasdaqDollar && data.dollar);
  const currentYear = new Date().getFullYear();

  // 시리즈별 데이터 존재 여부 확인
  const hasData = (key: SeriesKey): boolean => {
    switch (key) {
      case "gold": return !!data.gold?.some(v => v !== 0);
      case "bitcoin": return !!data.bitcoin?.some(v => v !== 0);
      case "realEstate": return !!data.realEstate?.some(v => v !== 0);
      case "dollar": return !!data.dollar?.some(v => v !== 0);
      default: return true;
    }
  };

  const toggleSeries = (key: SeriesKey) => {
    if (!hasData(key)) return;
    setActiveSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 선택 지수의 값 가져오기 (기본/환율에 따라)
  const getSeriesValues = (key: SeriesKey): number[] => {
    if (rateMode === "dollar" && hasDollarData) {
      if (key === "sp500") return data.sp500Dollar!;
      if (key === "nasdaq") return data.nasdaqDollar!;
    }
    switch (key) {
      case "sp500": return data.sp500;
      case "nasdaq": return data.nasdaq;
      case "kospi": return data.kospi;
      case "gold": return data.gold || [];
      case "bitcoin": return data.bitcoin || [];
      case "dollar": return data.dollar || [];
      case "realEstate": return data.realEstate || [];
    }
  };

  // 라인 차트 데이터 변환
  const chartData = data.months.map((month, idx) => {
    const point: Record<string, string | number | null> = { name: month };
    point.account = data.account[idx] ?? null;

    for (const key of activeSeries) {
      const values = getSeriesValues(key);
      point[key] = values[idx] ?? null;
    }

    return point;
  });

  // Y축 범위 계산 (활성 시리즈 기준)
  const accountValues = data.account.filter((v): v is number => v !== null);
  const activeValues = [
    ...accountValues,
    ...Array.from(activeSeries).flatMap(key => getSeriesValues(key)),
  ];
  const minValue = activeValues.length > 0 ? Math.min(...activeValues) : -10;
  const maxValue = activeValues.length > 0 ? Math.max(...activeValues) : 10;
  const yMin = Math.floor(minValue / 10) * 10 - 10;
  const yMax = Math.ceil(maxValue / 10) * 10 + 10;

  // 현재 값 (마지막 데이터)
  const latestIdx = data.months.length - 1;
  const lastValidAccountIdx = data.account.reduce<number>(
    (lastIdx, val, idx) => (val !== null ? idx : lastIdx),
    0
  );
  const lastValidAccountValue = data.account[lastValidAccountIdx];

  // 드롭다운 버튼 라벨
  const activeSeriesArray = Array.from(activeSeries);
  const selectorLabel = activeSeriesArray.length <= 3
    ? activeSeriesArray.map(k => SERIES_OPTIONS.find(o => o.key === k)?.label).filter(Boolean).join(", ")
    : `${activeSeriesArray.length}개 지표`;

  // Tooltip formatter
  const tooltipFormatter = (value: number, name: string) => {
    const option = SERIES_OPTIONS.find(o => o.key === name);
    let label = name === "account" ? "내 투자" : (option?.label || name);
    if (rateMode === "dollar" && (name === "sp500" || name === "nasdaq")) {
      label += "(환율)";
    }
    return [
      `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
      label,
    ];
  };

  // 활성 시리즈 라인 렌더
  const renderActiveLines = (isDot: boolean, strokeWidth = 2) => (
    <>
      {Array.from(activeSeries).map(key => (
        <Line
          key={key}
          type="monotone"
          dataKey={key}
          stroke={COLORS[key]}
          strokeWidth={strokeWidth}
          strokeDasharray="5 5"
          dot={isDot ? { fill: COLORS[key], strokeWidth: 0, r: 3 } : false}
          activeDot={{ r: 5, fill: COLORS[key], stroke: "#ffffff", strokeWidth: 2 }}
          name={key}
          connectNulls
        />
      ))}
    </>
  );

  // 카드뷰 차트
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
        domain={[yMin, yMax]}
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
        activeDot={{ r: 5, fill: COLORS.account, stroke: "#ffffff", strokeWidth: 2 }}
        name="account"
      />
      {renderActiveLines(false)}
    </LineChart>
  );

  // 전체화면 차트
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
      {renderActiveLines(true)}
    </LineChart>
  );

  const rateModeLabel = rateMode === "dollar" ? "환율 적용" : "기본";

  // 활성 시리즈 레전드
  const renderLegend = (size: "sm" | "md" = "sm") => {
    const dotH = size === "sm" ? "h-1" : "h-1.5";
    const dotW = size === "sm" ? "w-3" : "w-4";
    const accountDotH = size === "sm" ? "h-1" : "h-1";
    const accountDotW = size === "sm" ? "w-3" : "w-4";
    const textSize = size === "sm" ? "text-[10px]" : "text-xs";
    const gap = size === "sm" ? "gap-3" : "gap-4";

    return (
      <div className={`flex items-center ${gap} flex-wrap`}>
        <div className="flex items-center gap-1.5">
          <div className={`${accountDotW} ${accountDotH} rounded`} style={{ backgroundColor: COLORS.account }} />
          <span className={`${textSize} text-muted-foreground`}>내 투자</span>
        </div>
        {Array.from(activeSeries).map(key => {
          const opt = SERIES_OPTIONS.find(o => o.key === key);
          if (!opt) return null;
          let label = opt.label;
          if (rateMode === "dollar" && (key === "sp500" || key === "nasdaq")) {
            label += "(환율)";
          }
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`${dotW} ${dotH} rounded`} style={{ backgroundColor: opt.color }} />
              <span className={`${textSize} text-muted-foreground`}>{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Summary Cards 렌더
  const activeSummaryItems = Array.from(activeSeries).filter(key => hasData(key));
  const totalCards = 1 + activeSummaryItems.length; // 1 for account
  const gridCols = totalCards <= 2 ? "grid-cols-2" : "grid-cols-4";

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
              title={`${currentYear}년 주요지수 수익률 비교 (${rateModeLabel})`}
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
                  {renderLegend("md")}
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

        {/* 컨트롤: 멀티셀렉트 드롭다운 + 기본/환율 토글 */}
        <div className="flex items-center gap-2">
          {/* 멀티셀렉트 드롭다운 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors"
            >
              <span>{selectorLabel || "지표 선택"}</span>
              <svg
                className={`w-3 h-3 transition-transform ${showSelector ? "rotate-180" : ""}`}
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
                <div className="absolute top-full left-0 mt-1 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px]">
                  {SERIES_OPTIONS.map((opt) => {
                    const isActive = activeSeries.has(opt.key);
                    const available = hasData(opt.key);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleSeries(opt.key)}
                        disabled={!available}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${
                          !available
                            ? "text-muted-foreground/40 cursor-not-allowed"
                            : isActive
                              ? "text-foreground"
                              : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {/* 컬러 dot */}
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: available ? opt.color : "#d1d5db" }}
                        />
                        {/* 체크박스 */}
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          isActive ? "bg-blue-500 border-blue-500" : "border-gray-300"
                        }`}>
                          {isActive && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <title>선택됨</title>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
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
        {renderLegend("sm")}
      </div>

      {/* Card Chart */}
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          {renderCardChart()}
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className={`grid gap-2 ${gridCols}`}>
        {/* 내 투자 카드 (항상 표시) */}
        <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
          <span className="text-[9px] text-muted-foreground block mb-0.5">내 투자</span>
          {lastValidAccountValue != null ? (
            <div className="text-sm font-bold text-green-500">
              {lastValidAccountValue >= 0 ? "+" : ""}{lastValidAccountValue.toFixed(1)}%
            </div>
          ) : (
            <div className="text-sm font-bold text-muted-foreground">-</div>
          )}
        </div>
        {/* 활성 시리즈 카드들 */}
        {activeSummaryItems.map(key => {
          const opt = SERIES_OPTIONS.find(o => o.key === key)!;
          const values = getSeriesValues(key);
          const val = values[latestIdx] ?? 0;
          let label = opt.label;
          if (rateMode === "dollar" && (key === "sp500" || key === "nasdaq")) {
            label += "(환율)";
          }
          return (
            <div key={key} className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-center">
              <span className="text-[9px] text-muted-foreground block mb-0.5">{label}</span>
              <div className="text-sm font-bold" style={{ color: opt.color }}>
                {val >= 0 ? "+" : ""}{val.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden Chart for Capture */}
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
          <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {currentYear}년 주요지수 수익률 비교 ({rateModeLabel})
          </h3>
          <p style={{ fontSize: "14px", color: "#64748b", margin: "4px 0 0 0" }}>
            vs {activeSeriesArray.map(k => SERIES_OPTIONS.find(o => o.key === k)?.label).filter(Boolean).join(", ")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "16px", height: "3px", borderRadius: "2px", backgroundColor: COLORS.account }} />
            <span style={{ fontSize: "14px", color: "#64748b" }}>내 투자</span>
          </div>
          {activeSeriesArray.map(key => {
            const opt = SERIES_OPTIONS.find(o => o.key === key);
            if (!opt) return null;
            return (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "16px", height: "2px", borderRadius: "2px", backgroundColor: opt.color }} />
                <span style={{ fontSize: "14px", color: "#64748b" }}>{opt.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ width: "100%", height: "350px" }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderFullChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
