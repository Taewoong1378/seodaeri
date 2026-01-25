"use client";

import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getMarketIndices,
  type MarketIndexItem,
  type MarketIndicesResult,
} from "../../actions/market-indices";

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// 한국 지수 카드 (코스피, 코스닥)
function KoreanIndexCard({ item }: { item: MarketIndexItem }) {
  const isKospi = item.name === "KOSPI";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 ${
        isKospi
          ? "bg-gradient-to-br from-rose-500 to-red-600"
          : "bg-gradient-to-br from-amber-500 to-orange-600"
      }`}
    >
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20" />
        <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
      </div>

      <div className="relative z-10 space-y-1">
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          {item.nameKr}
        </span>
        <div className="text-2xl font-bold text-white tracking-tight">
          {formatNumber(item.price)}
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          {item.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-white/90" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-white/90" />
          )}
          <span className="text-sm font-semibold text-white/90">
            {item.isPositive ? "+" : "-"}{formatNumber(item.change)}
          </span>
          <span className="text-sm font-semibold text-white/90">
            ({item.isPositive ? "+" : "-"}{formatNumber(item.changePercent)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// 미국 지수 카드 (S&P500, 나스닥)
function USIndexCard({ item }: { item: MarketIndexItem }) {
  const isSP500 = item.name === "S&P500";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 ${
        isSP500
          ? "bg-gradient-to-br from-blue-500 to-indigo-600"
          : "bg-gradient-to-br from-violet-500 to-purple-600"
      }`}
    >
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20" />
        <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
      </div>

      <div className="relative z-10 space-y-1">
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
          {item.nameKr}
        </span>
        <div className="text-2xl font-bold text-white tracking-tight">
          {formatNumber(item.price)}
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          {item.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-white/90" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-white/90" />
          )}
          <span className="text-sm font-semibold text-white/90">
            {item.isPositive ? "+" : "-"}{formatNumber(item.change)}
          </span>
          <span className="text-sm font-semibold text-white/90">
            ({item.isPositive ? "+" : "-"}{formatNumber(item.changePercent)}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// 환율 카드
function ExchangeRateCard({ item }: { item: MarketIndexItem }) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-teal-600">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/20" />
        <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white/10" />
      </div>

      <div className="relative z-10 space-y-1">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-white/80" />
          <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
            {item.nameKr}
          </span>
        </div>
        <div className="text-2xl font-bold text-white tracking-tight">
          {formatNumber(item.price, 2)}
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="text-sm font-medium text-white/70">원</span>
        </div>
      </div>
    </div>
  );
}

function MarketIndicesSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[
          "from-rose-500/30 to-red-600/30",
          "from-amber-500/30 to-orange-600/30",
          "from-blue-500/30 to-indigo-600/30",
          "from-violet-500/30 to-purple-600/30",
          "from-emerald-500/30 to-teal-600/30",
        ].map((gradient, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 space-y-2 animate-pulse bg-gradient-to-br ${gradient}`}
          >
            <div className="h-3 w-12 bg-white/20 rounded" />
            <div className="h-7 w-20 bg-white/20 rounded" />
            <div className="h-4 w-24 bg-white/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketIndicesCard() {
  const [data, setData] = useState<MarketIndicesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getMarketIndices();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch market indices:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    // 5분마다 자동 갱신
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <MarketIndicesSkeleton />;
  }

  if (!data?.success || (data.indices.length === 0 && !data.exchangeRate)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-foreground">오늘의 시장</h3>
        <span className="text-xs text-muted-foreground">실시간</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 한국 지수 */}
        {data.indices
          .filter((idx) => idx.name === "KOSPI" || idx.name === "KOSDAQ")
          .map((item) => (
            <KoreanIndexCard key={item.name} item={item} />
          ))}

        {/* 미국 지수 */}
        {data.indices
          .filter((idx) => idx.name === "S&P500" || idx.name === "NASDAQ")
          .map((item) => (
            <USIndexCard key={item.name} item={item} />
          ))}

        {/* 환율 */}
        {data.exchangeRate && <ExchangeRateCard item={data.exchangeRate} />}
      </div>
    </div>
  );
}
