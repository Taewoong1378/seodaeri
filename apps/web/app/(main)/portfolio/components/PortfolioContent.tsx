'use client'

import { useDashboard } from '../../../../hooks'
import { BenefitBanner } from './BenefitBanner'
import { PortfolioClient } from './PortfolioClient'
import { PortfolioSkeleton } from './PortfolioSkeleton'

function formatCurrency(amount: number, compact = false): string {
  if (compact && amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}억`
  }
  if (compact && amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만`
  }
  return new Intl.NumberFormat('ko-KR').format(Math.round(amount))
}

interface PortfolioContentProps {
  sheetUrl: string | null
  isStandalone: boolean
}

export function PortfolioContent({ sheetUrl, isStandalone }: PortfolioContentProps) {
  const { data, isLoading } = useDashboard()

  if (isLoading || !data) {
    return <PortfolioSkeleton />
  }

  const portfolio = data.portfolio || []
  const totalAsset = data.totalAsset || 0

  // 시트의 투자비중 사용 (없으면 계산)
  const portfolioWithWeight = portfolio.map((item) => ({
    ...item,
    weight:
      item.weight > 0 ? item.weight : totalAsset > 0 ? (item.totalValue / totalAsset) * 100 : 0,
  }))

  return (
    <>
      {/* Summary */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">총 평가금액</h2>
          <span className="text-xs text-muted-foreground">{portfolio.length}개 종목</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tracking-tight">
            {formatCurrency(totalAsset)}
          </span>
          <span className="text-sm text-muted-foreground font-medium">원</span>
        </div>
        <div className="flex items-center gap-4 text-sm bg-card p-4 rounded-[20px] border border-border shadow-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">투자원금</span>
            <span className="text-foreground font-medium">
              {formatCurrency(data?.totalInvested ?? 0)}원
            </span>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground">수익금</span>
            <span
              className={`font-medium ${
                (data?.totalProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {formatCurrency(data?.totalProfit ?? 0)}원
            </span>
          </div>
        </div>
      </section>

      {/* Account Opening Banner */}
      <BenefitBanner />

      {/* Portfolio Content (List or Chart) */}
      <PortfolioClient portfolio={portfolioWithWeight} isStandalone={isStandalone} />
    </>
  )
}
