import { KpiCard } from '@/components/kpi-card'
import { SectionCard } from '@/components/section-card'
import { DividendTrendChart } from '@/components/charts/dividend-trend-chart'
import { TopDividendStocksChart } from '@/components/charts/top-dividend-stocks-chart'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@repo/database'

type Dividend = Database['public']['Tables']['dividends']['Row']
type User = Database['public']['Tables']['users']['Row']

interface DividendAnalysisProps {
  dividends: Dividend[]
  users: User[]
}

export function DividendAnalysis({ dividends, users: _users }: DividendAnalysisProps) {
  // KPI: 총 배당금 + unique users
  const totalDividend = dividends.reduce((sum, d) => sum + (d.amount_krw ?? 0), 0)
  const uniqueUsers = new Set(dividends.map(d => d.user_id)).size
  const avgDividend = uniqueUsers > 0 ? totalDividend / uniqueUsers : 0

  // Chart 1: 월별 배당 추이 — group by YYYY-MM, sum amount_krw, compute cumulative
  const monthMap = new Map<string, number>()
  for (const d of dividends) {
    const month = (d.dividend_date ?? '').slice(0, 7) // YYYY-MM
    if (!month) continue
    monthMap.set(month, (monthMap.get(month) ?? 0) + (d.amount_krw ?? 0))
  }
  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )
  let cumulative = 0
  const monthlyData = sortedMonths.map(([month, amount]) => {
    cumulative += amount
    return { month, amount, cumulative }
  })

  // Chart 2: 배당금 TOP 10 종목 — group by ticker, sum amount_krw, top 10
  const tickerMap = new Map<string, { name: string; ticker: string; amount: number }>()
  for (const d of dividends) {
    const ticker = d.ticker ?? ''
    if (!ticker) continue
    const existing = tickerMap.get(ticker)
    if (existing) {
      existing.amount += d.amount_krw ?? 0
    } else {
      tickerMap.set(ticker, {
        name: d.name ?? ticker,
        ticker,
        amount: d.amount_krw ?? 0,
      })
    }
  }
  const topStocks = Array.from(tickerMap.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard
          title="총 배당금"
          value={formatCurrency(totalDividend)}
          description={`${uniqueUsers}명 수령`}
        />
        <KpiCard
          title="유저별 평균 배당금"
          value={formatCurrency(avgDividend)}
          description="배당 수령자 기준"
        />
      </div>
      <SectionCard title="월별 배당 추이" description="KRW 환산 기준">
        <DividendTrendChart data={monthlyData} />
      </SectionCard>
      <SectionCard title="배당금 TOP 10 종목" description="총 배당금액 기준">
        <TopDividendStocksChart data={topStocks} />
      </SectionCard>
    </div>
  )
}
