"use client";

import { Loader2, Search, X } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { type StockSearchResult, useStockSearch } from "../../hooks";

interface StockSearchInputProps {
  /** 선택된 종목 코드 */
  selectedCode: string;
  /** 선택된 종목명 */
  selectedName: string;
  /** 종목 선택 시 콜백 (code, name, market 전달) */
  onSelect: (code: string, name: string, market?: string) => void;
  /** 선택 해제 시 콜백 */
  onClear: () => void;
  /** 라벨 텍스트 */
  label?: string;
  /** placeholder */
  placeholder?: string;
  /** 다크 테마 여부 (DividendInputModal용) */
  darkTheme?: boolean;
  /** 외부에서 리셋할 때 사용 */
  resetKey?: number;
}

export function StockSearchInput({
  selectedCode,
  selectedName,
  onSelect,
  onClear,
  label = "종목 검색",
  placeholder = "종목명 또는 종목코드 검색",
  darkTheme = false,
  resetKey = 0,
}: StockSearchInputProps): JSX.Element {
  const {
    query,
    results,
    isSearching,
    showResults,
    setShowResults,
    handleQueryChange,
    handleSelect,
    reset,
  } = useStockSearch({
    onSelect: (stock: StockSearchResult) => {
      onSelect(stock.code, stock.name, stock.market);
    },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  // resetKey가 변경되면 검색 상태 초기화
  useEffect(() => {
    if (resetKey > 0) {
      reset();
    }
  }, [resetKey, reset]);

  // 이미 선택된 종목이 있으면 표시
  if (selectedCode) {
    return (
      <div className="space-y-2">
        <label
          htmlFor="stock-search"
          className={`text-sm font-medium ${
            darkTheme ? "text-slate-300" : "text-muted-foreground"
          }`}
        >
          {label}
        </label>
        <div
          className={`flex items-center gap-3 p-3 h-11 rounded-lg border transition-all duration-200 ${
            darkTheme
              ? "bg-white/5 border-white/10"
              : "bg-background border-border shadow-sm"
          }`}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`font-semibold truncate ${
                  darkTheme ? "text-white" : "text-foreground"
                }`}
              >
                {selectedName || selectedCode}
              </span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md bg-muted font-medium ${
                  darkTheme ? "bg-white/10 text-slate-400" : "text-muted-foreground"
                }`}
              >
                {selectedCode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              reset();
            }}
            className={`p-1.5 rounded-full transition-colors ${
              darkTheme
                ? "text-slate-400 hover:text-red-400 hover:bg-white/10"
                : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            }`}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <label
        htmlFor="stock-search"
        className={`text-sm font-medium ${
          darkTheme ? "text-slate-300" : "text-muted-foreground"
        }`}
      >
        {label}
      </label>
      <div className="relative group">
        <div
          className={`relative flex items-center w-full h-11 rounded-lg border transition-all duration-200 ease-in-out focus-within-container
            ${
              darkTheme
                ? "bg-white/5 border-white/10 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
                : "bg-background border-border shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30"
            }
          `}
          onClick={() => inputRef.current?.focus()}
        >
          <Search
            size={18}
            className={`ml-4 mr-3 flex-shrink-0 transition-colors duration-200 ${
              darkTheme
                ? "text-slate-500 group-focus-within:text-primary"
                : "text-muted-foreground group-focus-within:text-primary"
            }`}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            placeholder={placeholder}
            data-no-ring
            className={`flex-1 h-full bg-transparent border-none text-base focus:outline-none focus:ring-0 focus:border-transparent
              ${
                darkTheme
                  ? "text-white placeholder:text-slate-500"
                  : "text-foreground placeholder:text-muted-foreground"
              }
            `}
            autoComplete="off"
            id="stock-search"
          />
          {isSearching && (
            <div className="mr-4 flex-shrink-0">
              <Loader2
                size={18}
                className={`animate-spin ${
                  darkTheme ? "text-slate-500" : "text-primary"
                }`}
              />
            </div>
          )}
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults && results.length > 0 && (
          <div
            className={`absolute z-50 w-full mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-200 ${
              darkTheme
                ? "bg-[#1e293b] border border-white/10"
                : "bg-popover border border-border"
            }`}
          >
            {results.map((stock) => (
              <button
                key={stock.code}
                type="button"
                onClick={() => handleSelect(stock)}
                className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between group/item border-b border-gray-50 last:border-0 ${
                  darkTheme
                    ? "hover:bg-white/10 border-white/5"
                    : "hover:bg-blue-50/50"
                }`}
              >
                <div className="min-w-0 flex-1 mr-3">
                  <div
                    className={`font-medium truncate ${
                      darkTheme
                        ? "text-white"
                        : "text-foreground group-hover/item:text-primary"
                    }`}
                  >
                    {stock.name}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      darkTheme ? "text-slate-400" : "text-muted-foreground"
                    }`}
                  >
                    {stock.code}
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                    stock.market === "KOSPI"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
                      : stock.market === "KOSDAQ"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                  }`}
                >
                  {stock.market}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {showResults && query && !isSearching && results.length === 0 && (
          <div
            className={`absolute z-50 w-full mt-2 rounded-lg shadow-xl p-4 text-center animate-in fade-in zoom-in-95 duration-200 ${
              darkTheme
                ? "bg-[#1e293b] border border-white/10"
                : "bg-popover border border-border"
            }`}
          >
            <p
              className={`text-sm ${
                darkTheme ? "text-slate-400" : "text-muted-foreground"
              }`}
            >
              검색 결과가 없습니다.
            </p>
          </div>
        )}
      </div>

      {/* 직접 입력 안내 */}
      {!selectedCode && query && !isSearching && results.length === 0 && (
        <p
          className={`text-xs px-1 ${
            darkTheme ? "text-slate-500" : "text-muted-foreground"
          }`}
        >
          찾으시는 종목이 없나요? 아래에서 직접 입력해주세요.
        </p>
      )}
    </div>
  );
}
