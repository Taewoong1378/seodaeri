'use client';

import { Card, CardContent } from '@repo/design-system/components/card';
import { cn } from '@repo/design-system/lib/utils';
import { BarChart3, List, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { PortfolioTreemap } from './PortfolioTreemap';

interface PortfolioItem {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  profit: number;
  yieldPercent: number;
  weight: number;
}

interface PortfolioClientProps {
  portfolio: PortfolioItem[];
}

function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`;
  }
  if (compact && amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`;
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

export function PortfolioClient({ portfolio }: PortfolioClientProps) {
  const [view, setView] = useState<'list' | 'chart'>('list');

  // 비중 순으로 정렬 (높은 비중부터)
  const sortedPortfolio = [...portfolio].sort(
    (a, b) => b.weight - a.weight
  );

  return (
    <div className="space-y-6">
      {/* View Switcher */}
      <div className="flex justify-center">
        <div className="flex items-center bg-muted p-1 rounded-full border border-border">
          <button
            type="button"
            onClick={() => setView('list')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              view === 'list' 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <List size={16} />
            리스트
          </button>
          <button
            type="button"
            onClick={() => setView('chart')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              view === 'chart' 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <BarChart3 size={16} />
            차트
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {view === 'chart' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-medium text-muted-foreground">포트폴리오 비중</h3>
              <span className="text-xs text-muted-foreground">평가금액 기준</span>
            </div>
            <PortfolioTreemap data={portfolio} />
            
            {/* Legend / Top Holdings */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {portfolio
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 4)
                .map((item, index) => (
                  <div key={item.ticker} className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border">
                    <div 
                      className="w-2 h-8 rounded-full" 
                      style={{ backgroundColor: ['#059669', '#a3e635', '#10b981', '#ef4444'][index % 4] }} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                      <p className="text-sm font-bold text-foreground">{item.weight.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">보유 종목</h3>
            <div className="space-y-2">
              {sortedPortfolio.map((item) => (
                <Card
                  key={item.ticker}
                  className="bg-card border-border shadow-sm rounded-[24px] overflow-hidden hover:bg-muted/50 transition-colors"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {item.name || item.ticker}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {item.ticker}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {item.quantity.toLocaleString()}주
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">
                            평단 {formatCurrency(item.avgPrice)}원
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-foreground">
                          {formatCurrency(item.totalValue, true)}원
                        </div>
                        <div
                          className={`flex items-center justify-end gap-1 text-xs ${
                            item.yieldPercent >= 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {item.yieldPercent >= 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {formatPercent(item.yieldPercent)}
                        </div>
                      </div>
                    </div>
                    {/* Weight bar */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">포트폴리오 비중</span>
                        <span className="text-muted-foreground">{item.weight.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(item.weight, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
