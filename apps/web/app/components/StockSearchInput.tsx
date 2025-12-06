'use client';

import { Input } from '@repo/design-system/components/input';
import { Label } from '@repo/design-system/components/label';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect } from 'react';
import { useStockSearch, type StockSearchResult } from '../../hooks';

interface StockSearchInputProps {
  /** 선택된 종목 코드 */
  selectedCode: string;
  /** 선택된 종목명 */
  selectedName: string;
  /** 종목 선택 시 콜백 (code, name 전달) */
  onSelect: (code: string, name: string) => void;
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
  label = '종목 검색',
  placeholder = '종목명 또는 종목코드 검색',
  darkTheme = false,
  resetKey = 0,
}: StockSearchInputProps) {
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
      onSelect(stock.code, stock.name);
    },
  });

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
        <Label className={darkTheme ? 'text-slate-300' : 'text-muted-foreground'}>
          {label}
        </Label>
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          darkTheme
            ? 'bg-white/5 border-white/10'
            : 'bg-muted/50 border-border'
        }`}>
          <div className="flex-1">
            <span className={`font-medium ${darkTheme ? 'text-white' : 'text-foreground'}`}>
              {selectedName || selectedCode}
            </span>
            <span className={`ml-2 text-sm ${darkTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
              ({selectedCode})
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              onClear();
              reset();
            }}
            className={`p-1 rounded-full transition-colors ${
              darkTheme
                ? 'text-slate-400 hover:text-red-400 hover:bg-white/10'
                : 'text-muted-foreground hover:text-destructive hover:bg-muted'
            }`}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className={darkTheme ? 'text-slate-300' : 'text-muted-foreground'}>
        {label}
      </Label>
      <div className="relative">
        <div className="relative">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            darkTheme ? 'text-slate-500' : 'text-muted-foreground'
          }`} />
          <Input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            placeholder={placeholder}
            className={`pl-9 ${
              darkTheme
                ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                : 'bg-muted/50 border-border text-foreground placeholder:text-muted-foreground'
            }`}
            autoComplete="off"
          />
          {isSearching && (
            <Loader2 size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 animate-spin ${
              darkTheme ? 'text-slate-500' : 'text-muted-foreground'
            }`} />
          )}
        </div>

        {/* 검색 결과 드롭다운 */}
        {showResults && results.length > 0 && (
          <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto ${
            darkTheme
              ? 'bg-[#1e293b] border border-white/10'
              : 'bg-popover border border-border'
          }`}>
            {results.map((stock) => (
              <button
                key={stock.code}
                type="button"
                onClick={() => handleSelect(stock)}
                className={`w-full px-3 py-2 text-left transition-colors flex items-center justify-between ${
                  darkTheme
                    ? 'hover:bg-white/10'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div>
                  <span className={`font-medium ${darkTheme ? 'text-white' : 'text-foreground'}`}>
                    {stock.name}
                  </span>
                  <span className={`ml-2 text-sm ${darkTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
                    {stock.code}
                  </span>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  stock.market === 'KOSPI'
                    ? 'bg-blue-500/20 text-blue-400'
                    : stock.market === 'KOSDAQ'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {stock.market}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {showResults && query && !isSearching && results.length === 0 && (
          <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg p-3 ${
            darkTheme
              ? 'bg-[#1e293b] border border-white/10'
              : 'bg-popover border border-border'
          }`}>
            <p className={`text-sm text-center ${darkTheme ? 'text-slate-400' : 'text-muted-foreground'}`}>
              검색 결과가 없습니다. 종목코드를 직접 입력하세요.
            </p>
          </div>
        )}
      </div>

      {/* 직접 입력 안내 */}
      {!selectedCode && query && !isSearching && results.length === 0 && (
        <p className={`text-xs mt-1 ${darkTheme ? 'text-slate-500' : 'text-muted-foreground'}`}>
          미국주식 등은 아래에서 직접 입력하세요
        </p>
      )}
    </div>
  );
}
