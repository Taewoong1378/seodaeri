import { useCallback, useRef, useState } from 'react';

export interface StockSearchResult {
  code: string;
  name: string;
  market: string;
}

interface UseStockSearchOptions {
  onSelect?: (stock: StockSearchResult) => void;
  debounceMs?: number;
}

export function useStockSearch(options: UseStockSearchOptions = {}) {
  const { onSelect, debounceMs = 300 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockSearchResult | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // API 호출
  const searchStocks = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 1) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/stocks/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.stocks || []);
    } catch (error) {
      console.error('Stock search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 검색어 변경 (debounce 적용)
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setShowResults(true);
    setSelectedStock(null); // 새로 검색 시작하면 선택 해제

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchStocks(newQuery);
    }, debounceMs);
  }, [searchStocks, debounceMs]);

  // 종목 선택
  const handleSelect = useCallback((stock: StockSearchResult) => {
    setSelectedStock(stock);
    setQuery(`${stock.name} (${stock.code})`);
    setShowResults(false);
    setResults([]);
    onSelect?.(stock);
  }, [onSelect]);

  // 선택 초기화
  const clearSelection = useCallback(() => {
    setSelectedStock(null);
    setQuery('');
    setResults([]);
    setShowResults(false);
  }, []);

  // 전체 리셋
  const reset = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsSearching(false);
    setShowResults(false);
    setSelectedStock(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    // State
    query,
    results,
    isSearching,
    showResults,
    selectedStock,

    // Actions
    setQuery,
    setShowResults,
    handleQueryChange,
    handleSelect,
    clearSelection,
    reset,
  };
}
