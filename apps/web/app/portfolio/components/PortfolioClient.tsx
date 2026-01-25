'use client';

import { Card, CardContent } from '@repo/design-system/components/card';
import { cn } from '@repo/design-system/lib/utils';
import { BarChart3, List, Pencil, PieChart, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { HoldingInputModal, type HoldingEditData } from './HoldingInputModal';
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
  country?: string;
}

interface PortfolioClientProps {
  portfolio: PortfolioItem[];
  isStandalone?: boolean;
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

export function PortfolioClient({ portfolio, isStandalone = false }: PortfolioClientProps) {
  const [view, setView] = useState<'list' | 'chart'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<HoldingEditData | undefined>(undefined);

  // 비중 순으로 정렬 (높은 비중부터)
  const sortedPortfolio = [...portfolio].sort(
    (a, b) => b.weight - a.weight
  );

  const handleAddNew = () => {
    setEditData(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditData({
      ticker: item.ticker,
      name: item.name,
      quantity: item.quantity,
      avgPrice: item.avgPrice,
      country: item.country || '한국',
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditData(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header with View Switcher and Add Button */}
      <div className="flex items-center justify-between">
        {/* View Switcher */}
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

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={16} />
          종목 추가
        </button>
      </div>

      {/* Modal */}
      <HoldingInputModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        editData={editData}
      />

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {portfolio.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <PieChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              보유 종목이 없습니다
            </h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
              {isStandalone ? (
                <>위의 '종목 추가' 버튼을 눌러<br />보유 종목을 추가해보세요.</>
              ) : (
                <>시트의 '3. 종목현황' 탭에 데이터를 입력하거나<br />위의 버튼을 눌러 종목을 추가해보세요.</>
              )}
            </p>
          </div>
        ) : view === 'chart' ? (
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
                      <p className="text-sm font-bold text-foreground">{Math.round(item.weight)}%</p>
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
                  className="bg-card border-border shadow-sm rounded-[24px] overflow-hidden hover:bg-muted/50 transition-colors cursor-pointer active:scale-[0.99]"
                  onClick={() => handleEdit(item)}
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
                      <div className="flex items-center gap-3">
                        <div className="text-right">
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
                        {/* 수정 힌트 아이콘 */}
                        <div className="p-1.5 rounded-full bg-muted/50 text-muted-foreground">
                          <Pencil size={14} />
                        </div>
                      </div>
                    </div>
                    {/* Weight bar */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">포트폴리오 비중</span>
                        <span className="text-muted-foreground">{Math.round(item.weight)}%</span>
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
