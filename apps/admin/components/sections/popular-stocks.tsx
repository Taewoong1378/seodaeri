import { SectionCard } from '@/components/section-card'
import { PopularStocksBarChart } from '@/components/charts/popular-stocks-bar-chart'
import { KrUsRatioDonut } from '@/components/charts/kr-us-ratio-donut'
import { EtfIndividualDonut } from '@/components/charts/etf-individual-donut'
import { getMarket, isETF } from '@/lib/utils'
import type { Database } from '@repo/database'

type Holding = Database['public']['Tables']['holdings']['Row']

interface PopularStocksProps {
  holdings: Holding[]
}

export function PopularStocks({ holdings }: PopularStocksProps) {
  // TOP 20 by unique holder count
  const tickerMap = new Map<string, { name: string; ticker: string; users: Set<string> }>()
  for (const h of holdings) {
    const existing = tickerMap.get(h.ticker)
    if (existing) {
      existing.users.add(h.user_id)
    } else {
      tickerMap.set(h.ticker, {
        name: h.name ?? h.ticker,
        ticker: h.ticker,
        users: new Set([h.user_id]),
      })
    }
  }

  const top20 = Array.from(tickerMap.values())
    .map(v => ({ name: v.name, ticker: v.ticker, count: v.users.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // KR vs US ratio (unique tickers)
  const krTickers = new Set<string>()
  const usTickers = new Set<string>()
  for (const h of holdings) {
    if (getMarket(h.currency) === '한국') {
      krTickers.add(h.ticker)
    } else {
      usTickers.add(h.ticker)
    }
  }
  const krUsData = [
    { name: '한국', value: krTickers.size },
    { name: '미국', value: usTickers.size },
  ]

  // ETF vs Individual (unique tickers)
  let etfCount = 0
  let individualCount = 0
  const seenTickers = new Set<string>()
  for (const h of holdings) {
    if (seenTickers.has(h.ticker)) continue
    seenTickers.add(h.ticker)
    if (isETF(h.name, h.ticker)) {
      etfCount++
    } else {
      individualCount++
    }
  }
  const etfData = [
    { name: 'ETF', value: etfCount },
    { name: '개별종목', value: individualCount },
  ]

  return (
    <div className="space-y-6">
      <SectionCard title="TOP 20 인기 종목" description="보유자 수 기준">
        <PopularStocksBarChart data={top20} />
      </SectionCard>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard title="한국 / 미국 비율" description="고유 종목 수 기준">
          <KrUsRatioDonut data={krUsData} />
        </SectionCard>
        <SectionCard title="ETF / 개별종목 비율" description="고유 종목 수 기준">
          <EtfIndividualDonut data={etfData} />
        </SectionCard>
      </div>
    </div>
  )
}
