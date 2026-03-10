import { AuthGate } from '@/components/auth-gate'
import { AdminHeader } from '@/components/admin-header'
import { OverviewKpis } from '@/components/sections/overview-kpis'
import { PopularStocks } from '@/components/sections/popular-stocks'
import { PortfolioAnalysis } from '@/components/sections/portfolio-analysis'
import { UserActivity } from '@/components/sections/user-activity'
import { DataExport } from '@/components/sections/data-export'
import { getDashboardData } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  return (
    <AuthGate>
      <AdminHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <DashboardContent />
      </main>
    </AuthGate>
  )
}

async function DashboardContent() {
  const { users, holdings, transactions, snapshots } = await getDashboardData()

  return (
    <div className="space-y-8">
      {/* Section 1: 핵심 KPI */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">핵심 지표</h2>
        <OverviewKpis users={users} holdings={holdings} transactions={transactions} />
      </section>

      {/* Section 2: 인기 종목 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">인기 종목</h2>
        <PopularStocks holdings={holdings} />
      </section>

      {/* Section 3: 포트폴리오 분석 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">포트폴리오 분석</h2>
        <PortfolioAnalysis holdings={holdings} snapshots={snapshots} />
      </section>

      {/* Section 4: 유저 활동 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">유저 활동</h2>
        <UserActivity users={users} transactions={transactions} />
      </section>

      {/* Section 5: 데이터 내보내기 */}
      <section>
        <DataExport />
      </section>
    </div>
  )
}
