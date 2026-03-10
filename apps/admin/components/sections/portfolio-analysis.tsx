import { KpiCard } from '@/components/kpi-card'
import { SectionCard } from '@/components/section-card'
import { CurrencyDistributionDonut } from '@/components/charts/currency-distribution-donut'
import { PopularEtfsBarChart } from '@/components/charts/popular-etfs-bar-chart'
import { NewStocksTrendChart } from '@/components/charts/new-stocks-trend-chart'
import { formatCurrency, isETF, getWeekKey } from '@/lib/utils'
import type { Database } from '@repo/database'

type Holding = Database['public']['Tables']['holdings']['Row']
type Snapshot = Database['public']['Tables']['portfolio_snapshots']['Row']

interface PortfolioAnalysisProps {
  holdings: Holding[]
  snapshots: Snapshot[]
}

export function PortfolioAnalysis({ holdings, snapshots }: PortfolioAnalysisProps) {
  // Average investment per user from latest snapshots
  const latestByUser = new Map<string, Snapshot>()
  for (const s of snapshots) {
    if (!latestByUser.has(s.user_id)) {
      latestByUser.set(s.user_id, s) // snapshots already sorted desc
    }
  }
  const latestSnapshots = Array.from(latestByUser.values())
  const avgInvestment = latestSnapshots.length > 0
    ? latestSnapshots.reduce((sum, s) => sum + (s.total_invested ?? 0), 0) / latestSnapshots.length
    : 0

  // Currency distribution (weighted by avg_price * quantity)
  let krwTotal = 0
  let usdTotal = 0
  for (const h of holdings) {
    const value = (h.avg_price ?? 0) * (h.quantity ?? 0)
    if (h.currency === 'KRW') {
      krwTotal += value
    } else {
      usdTotal += value
    }
  }
  const currencyData = [
    { name: 'KRW', value: Math.round(krwTotal) },
    { name: 'USD', value: Math.round(usdTotal) },
  ]

  // Popular ETFs TOP 10
  const etfMap = new Map<string, { name: string; ticker: string; users: Set<string> }>()
  for (const h of holdings) {
    if (!isETF(h.name, h.ticker)) continue
    const existing = etfMap.get(h.ticker)
    if (existing) {
      existing.users.add(h.user_id)
    } else {
      etfMap.set(h.ticker, {
        name: h.name ?? h.ticker,
        ticker: h.ticker,
        users: new Set([h.user_id]),
      })
    }
  }
  const topEtfs = Array.from(etfMap.values())
    .map(v => ({ name: v.name, ticker: v.ticker, count: v.users.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // New stocks trend by week (based on holdings updated_at)
  const weekMap = new Map<string, Set<string>>()
  for (const h of holdings) {
    const week = getWeekKey(h.updated_at)
    const existing = weekMap.get(week)
    if (existing) {
      existing.add(h.ticker)
    } else {
      weekMap.set(week, new Set([h.ticker]))
    }
  }
  const weeklyTrend = Array.from(weekMap.entries())
    .map(([week, tickers]) => ({ week, count: tickers.size }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12) // last 12 weeks

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard
          title="유저별 평균 투자금"
          value={formatCurrency(avgInvestment)}
          description={`${latestSnapshots.length}명 기준 (최신 스냅샷)`}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard title="통화 분포 (KRW / USD)" description="투자금액 가중 합계">
          <CurrencyDistributionDonut data={currencyData} />
        </SectionCard>
        <SectionCard title="인기 ETF TOP 10" description="보유자 수 기준">
          <PopularEtfsBarChart data={topEtfs} />
        </SectionCard>
      </div>
      <SectionCard title="신규 종목 추가 추이" description="주별 고유 종목 수">
        <NewStocksTrendChart data={weeklyTrend} />
      </SectionCard>
    </div>
  )
}
