import { KpiCard } from '@/components/kpi-card'
import { SectionCard } from '@/components/section-card'
import { AssetGrowthChart } from '@/components/charts/asset-growth-chart'
import { YieldDistributionChart } from '@/components/charts/yield-distribution-chart'
import { BrokerDistributionDonut } from '@/components/charts/broker-distribution-donut'
import { formatCurrency, formatPercent } from '@/lib/utils'
import type { Database } from '@repo/database'

type Snapshot = Database['public']['Tables']['portfolio_snapshots']['Row']
type Holding = Database['public']['Tables']['holdings']['Row']

interface AssetPerformanceProps {
  snapshots: Snapshot[]
  holdings: Holding[]
}

export function AssetPerformance({ snapshots, holdings }: AssetPerformanceProps) {
  // Latest snapshot per user (snapshots assumed sorted desc)
  const latestByUser = new Map<string, Snapshot>()
  for (const s of snapshots) {
    if (!latestByUser.has(s.user_id)) {
      latestByUser.set(s.user_id, s)
    }
  }
  const latestSnapshots = Array.from(latestByUser.values())
  const userCount = latestSnapshots.length

  // KPI: 평균 수익률 (also compute median)
  const yields = latestSnapshots
    .map(s => s.yield_percent ?? 0)
    .sort((a, b) => a - b)
  const avgYield =
    yields.length > 0 ? yields.reduce((sum, y) => sum + y, 0) / yields.length : 0
  let medianYield = 0
  if (yields.length > 0) {
    const mid = Math.floor(yields.length / 2)
    if (yields.length % 2 === 1) {
      medianYield = yields[mid] ?? 0
    } else {
      medianYield = ((yields[mid - 1] ?? 0) + (yields[mid] ?? 0)) / 2
    }
  }

  // KPI: 총 관리 자산
  const totalAsset = latestSnapshots.reduce((sum, s) => sum + (s.total_asset ?? 0), 0)

  // Chart 1: 자산 성장 추이 — 중앙값(median) 사용 (이상치 영향 최소화)
  const getMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 1
      ? (sorted[mid] ?? 0)
      : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
  }

  const sortedSnapshots = [...snapshots].sort((a, b) =>
    (a.snapshot_date ?? '').localeCompare(b.snapshot_date ?? ''),
  )
  const allDates = [...new Set(sortedSnapshots.map(s => (s.snapshot_date ?? '').slice(0, 10)))].filter(Boolean).sort()
  const userLatest = new Map<string, Snapshot>()
  let dateIdx = 0
  const growthData = allDates.map(date => {
    while (dateIdx < sortedSnapshots.length && (sortedSnapshots[dateIdx]?.snapshot_date ?? '').slice(0, 10) <= date) {
      const s = sortedSnapshots[dateIdx]!
      userLatest.set(s.user_id, s)
      dateIdx++
    }
    const values = Array.from(userLatest.values())
    const assets = values.map(s => s.total_asset ?? 0)
    const profits = values.map(s => s.total_profit ?? 0)
    return {
      date,
      totalAsset: getMedian(assets),
      totalProfit: getMedian(profits),
    }
  })

  // Chart 2: 수익률 분포 — bucket latest yield_percent per user
  const bucketKeys = ['<-10%', '-10~-5%', '-5~0%', '0~5%', '5~10%', '10~20%', '20~30%', '30~50%', '50~100%', '>100%'] as const
  type BucketKey = (typeof bucketKeys)[number]
  const buckets = new Map<BucketKey, number>(bucketKeys.map(k => [k, 0]))
  const getBucket = (y: number): BucketKey => {
    if (y < -10) return '<-10%'
    if (y < -5) return '-10~-5%'
    if (y < 0) return '-5~0%'
    if (y < 5) return '0~5%'
    if (y < 10) return '5~10%'
    if (y < 20) return '10~20%'
    if (y < 30) return '20~30%'
    if (y < 50) return '30~50%'
    if (y < 100) return '50~100%'
    return '>100%'
  }
  for (const s of latestSnapshots) {
    const key = getBucket(s.yield_percent ?? 0)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  const yieldBuckets = bucketKeys.map(range => ({ range, count: buckets.get(range) ?? 0 }))

  // Chart 3: 브로커 분포 — group holdings by broker, count per broker
  const brokerMap = new Map<string, number>()
  for (const h of holdings) {
    const broker = h.broker
    if (!broker) continue
    brokerMap.set(broker, (brokerMap.get(broker) ?? 0) + 1)
  }
  const brokerData = Array.from(brokerMap.entries()).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard
          title="평균 수익률"
          value={formatPercent(avgYield)}
          description={`중앙값 ${formatPercent(medianYield)} · 최신 스냅샷 기준`}
        />
        <KpiCard
          title="총 관리 자산"
          value={formatCurrency(totalAsset)}
          description={`${userCount}명 기준`}
        />
      </div>
      <SectionCard title="자산 성장 추이" description="전체 유저 중앙값 추이">
        <AssetGrowthChart data={growthData} />
      </SectionCard>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard title="수익률 분포" description="유저별 현재 수익률">
          <YieldDistributionChart data={yieldBuckets} />
        </SectionCard>
        <SectionCard title="브로커 분포" description="보유종목 기준 증권사별">
          {brokerData.length > 0 ? (
            <BrokerDistributionDonut data={brokerData} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              브로커 데이터가 없습니다
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
