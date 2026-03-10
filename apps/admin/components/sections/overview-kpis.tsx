import { KpiCard } from '@/components/kpi-card'
import { formatNumber } from '@/lib/utils'
import type { Database } from '@repo/database'

type User = Database['public']['Tables']['users']['Row']
type Holding = Database['public']['Tables']['holdings']['Row']
type Transaction = Database['public']['Tables']['transactions']['Row']

interface OverviewKpisProps {
  users: User[]
  holdings: Holding[]
  transactions: Transaction[]
}

export function OverviewKpis({ users, holdings, transactions }: OverviewKpisProps) {
  const today = new Date().toISOString().split('T')[0] ?? ''
  const todaySignups = users.filter(u => u.created_at.startsWith(today)).length
  const standaloneCount = users.filter(u => !u.spreadsheet_id).length
  const sheetCount = users.filter(u => u.spreadsheet_id).length
  const uniqueTickers = new Set(holdings.map(h => h.ticker)).size
  const avgHoldingsPerUser = users.length > 0
    ? (holdings.length / users.length).toFixed(1)
    : '0'

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      <KpiCard title="총 사용자 수" value={formatNumber(users.length)} />
      <KpiCard
        title="오늘 가입"
        value={formatNumber(todaySignups)}
      />
      <KpiCard
        title="Standalone / Sheet"
        value={`${standaloneCount} / ${sheetCount}`}
        description={`독립형 ${standaloneCount}명, 시트 ${sheetCount}명`}
      />
      <KpiCard title="고유 보유 종목" value={formatNumber(uniqueTickers)} />
      <KpiCard
        title="평균 보유 종목/유저"
        value={avgHoldingsPerUser}
        description={`총 ${formatNumber(holdings.length)}개 보유`}
      />
      <KpiCard title="총 거래 건수" value={formatNumber(transactions.length)} />
    </div>
  )
}
