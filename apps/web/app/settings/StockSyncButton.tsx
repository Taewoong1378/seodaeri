"use client";

import { Button } from "@repo/design-system/components/button";
import { AlertCircle, Check, Database, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface SyncStatus {
  kr: {
    lastSync: string | null;
    count: number;
    status: "synced" | "not_synced";
  };
  us: {
    lastSync: string | null;
    count: number;
    status: "synced" | "not_synced";
  };
  total: number;
}

type SyncMarket = "kr" | "us";

export function StockSyncButton() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState<SyncMarket | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    market?: SyncMarket;
  } | null>(null);

  // 동기화 상태 조회
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/stocks/sync");
        if (res.ok) {
          const data = await res.json();
          setSyncStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch sync status:", error);
      }
    }
    fetchStatus();
  }, []);

  const handleSync = async (market: SyncMarket) => {
    setIsLoading(market);
    setResult(null);

    try {
      const res = await fetch("/api/stocks/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({ success: true, message: data.message, market });
        // 상태 재조회
        const statusRes = await fetch("/api/stocks/sync");
        if (statusRes.ok) {
          setSyncStatus(await statusRes.json());
        }
      } else {
        setResult({
          success: false,
          message: data.error || data.message || "동기화 실패",
          market,
        });
      }
    } catch (error) {
      setResult({ success: false, message: "네트워크 오류", market });
    } finally {
      setIsLoading(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "동기화 필요";
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <Database size={20} className="text-green-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">종목 DB</p>
          <p className="text-xs text-muted-foreground">
            {syncStatus
              ? `총 ${syncStatus.total.toLocaleString()}개`
              : "로딩 중..."}
          </p>
        </div>
      </div>

      {/* 한국/미국 동기화 카드 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 한국 */}
        <div className="p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">🇰🇷 한국</span>
          </div>
          <p className="text-xl font-bold text-foreground mb-1">
            {syncStatus?.kr.count.toLocaleString() || "0"}
          </p>
          <p className="text-[10px] text-muted-foreground mb-2">
            {formatDate(syncStatus?.kr.lastSync || null)}
          </p>
          <Button
            onClick={() => handleSync("kr")}
            disabled={isLoading !== null}
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs gap-1"
          >
            {isLoading === "kr" ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                동기화 중...
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                동기화
              </>
            )}
          </Button>
          {/* 한국 결과 메시지 */}
          {result?.market === "kr" && (
            <div
              className={`flex items-center gap-1 text-[10px] mt-2 ${
                result.success ? "text-green-500" : "text-red-500"
              }`}
            >
              {result.success ? <Check size={10} /> : <AlertCircle size={10} />}
              <span className="truncate">{result.message}</span>
            </div>
          )}
        </div>

        {/* 미국 */}
        <div className="p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">🇺🇸 미국</span>
          </div>
          <p className="text-xl font-bold text-foreground mb-1">
            {syncStatus?.us.count.toLocaleString() || "0"}
          </p>
          <p className="text-[10px] text-muted-foreground mb-2">
            {formatDate(syncStatus?.us.lastSync || null)}
          </p>
          <Button
            onClick={() => handleSync("us")}
            disabled={isLoading !== null}
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs gap-1"
          >
            {isLoading === "us" ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                동기화 중...
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                동기화
              </>
            )}
          </Button>
          {/* 미국 결과 메시지 */}
          {result?.market === "us" && (
            <div
              className={`flex items-center gap-1 text-[10px] mt-2 ${
                result.success ? "text-green-500" : "text-red-500"
              }`}
            >
              {result.success ? <Check size={10} /> : <AlertCircle size={10} />}
              <span className="truncate">{result.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* 안내 메시지 */}
      <p className="text-[10px] text-muted-foreground">
        한국: KRX API (장 운영일) / 미국: FMP API (API 키 필요)
      </p>
    </div>
  );
}
