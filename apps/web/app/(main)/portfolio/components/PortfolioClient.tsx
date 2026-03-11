'use client'

import { Card, CardContent } from '@repo/design-system/components/card'
import { cn } from '@repo/design-system/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  List,
  Loader2,
  Pencil,
  PieChart,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { queryKeys } from '../../../../lib/query-client'
import type { DashboardData } from '../../../actions/dashboard'
import { deleteHolding } from '../../../actions/holding'
import { ConfirmDialog } from '../../transactions/components/ConfirmDialog'
import { type HoldingEditData, HoldingInputModal } from './HoldingInputModal'

const PortfolioTreemap = dynamic(
  () => import('./PortfolioTreemap').then((mod) => mod.PortfolioTreemap),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-lg bg-gray-100" style={{ height: '200px' }} />
    ),
  },
)

interface PortfolioItem {
  ticker: string
  name: string
  quantity: number
  avgPrice: number
  avgPriceOriginal?: number
  currentPrice: number
  totalValue: number
  profit: number
  yieldPercent: number
  weight: number
  country?: string
}

interface PortfolioClientProps {
  portfolio: PortfolioItem[]
  isStandalone?: boolean
}

function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`
  }
  if (compact && amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount))
}

function formatPercent(value: number): string {
  const prefix = value >= 0 ? '+' : ''
  return `${prefix}${value.toFixed(2)}%`
}

// 기타자산 수량 단위 (주 대신 g, BTC 등)
const ALTERNATIVE_ASSET_UNITS: Record<string, string> = {
  BTC: 'BTC',
  ETH: 'ETH',
  XRP: 'XRP',
  SOL_CRYPTO: 'SOL',
  GOLD: 'g',
}

function formatQuantityUnit(ticker: string, quantity: number): string {
  const unit = ALTERNATIVE_ASSET_UNITS[ticker]
  if (unit) {
    // 소수점이 있으면 표시, 없으면 정수로
    const formatted =
      quantity % 1 === 0
        ? quantity.toLocaleString()
        : quantity.toLocaleString(undefined, { maximumFractionDigits: 8 })
    return `${formatted}${unit}`
  }
  return `${quantity.toLocaleString()}주`
}

export function PortfolioClient({ portfolio, isStandalone = false }: PortfolioClientProps) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'chart'>('list')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editData, setEditData] = useState<HoldingEditData | undefined>(undefined)
  const [deletingTicker, setDeletingTicker] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PortfolioItem | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // 비중 순으로 정렬 (높은 비중부터)
  // 현금은 항상 맨 아래, 나머지는 비중 순 정렬
  const sortedPortfolio = [...portfolio].sort((a, b) => {
    if (a.ticker === 'CASH' && b.ticker !== 'CASH') return 1
    if (a.ticker !== 'CASH' && b.ticker === 'CASH') return -1
    return b.weight - a.weight
  })

  const handleAddNew = () => {
    setEditData(undefined)
    setIsModalOpen(true)
  }

  const handleEdit = (item: PortfolioItem) => {
    setEditData({
      ticker: item.ticker,
      name: item.name,
      quantity: item.quantity,
      avgPrice: item.avgPriceOriginal ?? item.avgPrice,
      country: item.country || '한국',
    })
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditData(undefined)
  }

  const handleDeleteClick = (e: React.MouseEvent, item: PortfolioItem) => {
    e.stopPropagation()
    setDeleteTarget(item)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setDeletingTicker(deleteTarget.ticker)
    try {
      const result = await deleteHolding(deleteTarget.ticker)
      if (result.success) {
        setIsDeleteDialogOpen(false)
        // 낙관적 업데이트: 삭제된 종목 즉시 제거
        const deletedTicker = deleteTarget.ticker
        queryClient.setQueryData<DashboardData | null>(queryKeys.dashboard, (old) => {
          if (!old) return old
          const newPortfolio = old.portfolio.filter((p) => p.ticker !== deletedTicker)
          const totalAsset = newPortfolio.reduce((s, p) => s + p.totalValue, 0)
          return {
            ...old,
            portfolio: newPortfolio.map((p) => ({
              ...p,
              weight: totalAsset > 0 ? (p.totalValue / totalAsset) * 100 : 0,
            })),
            totalAsset,
          }
        })
        setDeleteTarget(null)
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard, refetchType: 'all' })
      }
    } finally {
      setDeletingTicker(null)
    }
  }

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
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              view === 'list'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            )}
          >
            <List size={16} />
            리스트
          </button>
          <button
            type="button"
            onClick={() => setView('chart')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
              view === 'chart'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
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
      <HoldingInputModal isOpen={isModalOpen} onClose={handleModalClose} editData={editData} />

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) setDeleteTarget(null)
        }}
        title="종목 삭제"
        description={
          deleteTarget
            ? `${deleteTarget.name} (${deleteTarget.ticker})을(를) 삭제하시겠습니까?\n삭제된 내역은 복구할 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        cancelText="취소"
        onConfirm={handleDeleteConfirm}
        isLoading={deletingTicker !== null}
        variant="danger"
      />

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {portfolio.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <PieChart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">보유 종목이 없습니다</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mb-6">
              {isStandalone ? (
                <>
                  위의 '종목 추가' 버튼을 눌러
                  <br />
                  보유 종목을 추가해보세요.
                </>
              ) : (
                <>
                  시트의 '3. 종목현황' 탭에 데이터를 입력하거나
                  <br />
                  위의 버튼을 눌러 종목을 추가해보세요.
                </>
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
                  <div
                    key={item.ticker}
                    className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border"
                  >
                    <div
                      className="w-2 h-8 rounded-full"
                      style={{
                        backgroundColor: ['#059669', '#a3e635', '#10b981', '#ef4444'][index % 4],
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                      <p className="text-sm font-bold text-foreground">
                        {Math.round(item.weight)}%
                      </p>
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
                  <CardContent className="p-4">
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
                          {item.ticker === 'CASH' ? (
                            <>
                              {item.quantity > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {formatCurrency(item.quantity)}원
                                </span>
                              )}
                              {item.quantity > 0 && (item.avgPriceOriginal ?? 0) > 0 && (
                                <span className="text-xs text-muted-foreground">+</span>
                              )}
                              {(item.avgPriceOriginal ?? 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ${formatCurrency(item.avgPriceOriginal!)}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground">
                                {formatQuantityUnit(item.ticker, item.quantity)}
                              </span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">
                                평단{' '}
                                {item.country === '미국' && item.avgPriceOriginal
                                  ? `$${formatCurrency(item.avgPriceOriginal)}`
                                  : `${formatCurrency(item.avgPrice)}원`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {formatCurrency(item.totalValue, true)}원
                          </div>
                          {item.ticker !== 'CASH' && (
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
                          )}
                        </div>
                        {/* 수정/삭제 버튼 */}
                        <div className="flex items-center gap-1">
                          <div className="p-1.5 rounded-full bg-muted/50 text-muted-foreground">
                            <Pencil size={14} />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, item)}
                            disabled={deletingTicker === item.ticker}
                            className="p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingTicker === item.ticker ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
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
  )
}
