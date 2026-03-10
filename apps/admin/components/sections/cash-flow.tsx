import { KpiCard } from '@/components/kpi-card'
import { SectionCard } from '@/components/section-card'
import { DepositWithdrawalChart } from '@/components/charts/deposit-withdrawal-chart'
import { BalanceTrendChart } from '@/components/charts/balance-trend-chart'
import { formatCurrency } from '@/lib/utils'
import type { Database } from '@repo/database'

type Deposit = Database['public']['Tables']['deposits']['Row']
type Snapshot = Database['public']['Tables']['portfolio_snapshots']['Row']

interface CashFlowProps {
  deposits: Deposit[]
  snapshots: Snapshot[]
}

export function CashFlow({ deposits, snapshots }: CashFlowProps) {
  // KPI: 총 입금액 / 총 출금액
  let totalDeposit = 0
  let depositCount = 0
  let totalWithdraw = 0
  let withdrawCount = 0
  for (const d of deposits) {
    if (d.type === 'DEPOSIT') {
      totalDeposit += d.amount ?? 0
      depositCount++
    } else if (d.type === 'WITHDRAW') {
      totalWithdraw += d.amount ?? 0
      withdrawCount++
    }
  }

  // Chart 1: 월별 입출금 추이 — group by YYYY-MM
  const monthFlowMap = new Map<string, { deposit: number; withdrawal: number }>()
  for (const d of deposits) {
    const month = (d.deposit_date ?? '').slice(0, 7)
    if (!month) continue
    const existing = monthFlowMap.get(month) ?? { deposit: 0, withdrawal: 0 }
    if (d.type === 'DEPOSIT') {
      existing.deposit += d.amount ?? 0
    } else if (d.type === 'WITHDRAW') {
      existing.withdrawal += d.amount ?? 0
    }
    monthFlowMap.set(month, existing)
  }
  const monthlyFlow = Array.from(monthFlowMap.entries())
    .map(([month, { deposit, withdrawal }]) => ({ month, deposit, withdrawal }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Chart 2: 계좌 잔고 추이 — 월별 유저당 최신 스냅샷 1개만 사용하여 합산
  const monthUserMap = new Map<string, Map<string, number>>()
  // snapshots are sorted desc, so first occurrence per user per month is latest
  for (const s of snapshots) {
    const month = (s.snapshot_date ?? '').slice(0, 7)
    if (!month) continue
    if (!monthUserMap.has(month)) monthUserMap.set(month, new Map())
    const userMap = monthUserMap.get(month)!
    if (!userMap.has(s.user_id)) {
      userMap.set(s.user_id, s.total_asset ?? 0)
    }
  }
  const balanceTrend = Array.from(monthUserMap.entries())
    .map(([month, userMap]) => {
      let balance = 0
      for (const val of userMap.values()) balance += val
      return { month, balance }
    })
    .sort((a, b) => a.month.localeCompare(b.month))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard
          title="총 입금액"
          value={formatCurrency(totalDeposit)}
          description={`${depositCount}건`}
        />
        <KpiCard
          title="총 출금액"
          value={formatCurrency(totalWithdraw)}
          description={`${withdrawCount}건`}
        />
      </div>
      <SectionCard title="월별 입출금 추이" description="전체 유저 합산">
        <DepositWithdrawalChart data={monthlyFlow} />
      </SectionCard>
      <SectionCard title="계좌 잔고 추이" description="전체 유저 합산 월별 잔고">
        <BalanceTrendChart data={balanceTrend} />
      </SectionCard>
    </div>
  )
}
