import { SectionCard } from '@/components/section-card'
import { SignupTrendChart } from '@/components/charts/signup-trend-chart'
import { TransactionVolumeChart } from '@/components/charts/transaction-volume-chart'
import { getDateKey, getWeekKey } from '@/lib/utils'
import type { Database } from '@repo/database'

type User = Database['public']['Tables']['users']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

interface UserActivityProps {
  users: User[]
  transactions: Transaction[]
}

export function UserActivity({ users, transactions }: UserActivityProps) {
  // Signup trend: daily + cumulative
  const dailyMap = new Map<string, number>()
  for (const u of users) {
    const date = getDateKey(u.created_at)
    dailyMap.set(date, (dailyMap.get(date) ?? 0) + 1)
  }
  const sortedDates = Array.from(dailyMap.keys()).sort()
  let cumulative = 0
  const signupData = sortedDates.map(date => {
    const daily = dailyMap.get(date) ?? 0
    cumulative += daily
    return { date, daily, cumulative }
  })

  // Transaction volume by week (BUY/SELL/DIVIDEND only)
  const weeklyTxMap = new Map<string, { BUY: number; SELL: number; DIVIDEND: number }>()
  for (const tx of transactions) {
    if (!tx.trade_date) continue
    if (!['BUY', 'SELL', 'DIVIDEND'].includes(tx.type)) continue
    const week = getWeekKey(tx.trade_date)
    const existing = weeklyTxMap.get(week) ?? { BUY: 0, SELL: 0, DIVIDEND: 0 }
    const type = tx.type as 'BUY' | 'SELL' | 'DIVIDEND'
    existing[type]++
    weeklyTxMap.set(week, existing)
  }
  const txData = Array.from(weeklyTxMap.entries())
    .map(([week, counts]) => ({ week, ...counts }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12)

  return (
    <div className="space-y-6">
      <SectionCard title="가입 추이" description="일별 가입 수 + 누적">
        <SignupTrendChart data={signupData} />
      </SectionCard>
      <SectionCard title="거래 유형별 볼륨" description="주별 BUY / SELL / DIVIDEND">
        <TransactionVolumeChart data={txData} />
      </SectionCard>
    </div>
  )
}
