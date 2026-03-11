import { AuthGate } from '@/components/auth-gate'
import { AdminHeader } from '@/components/admin-header'
import { OverviewKpis } from '@/components/sections/overview-kpis'
import { PopularStocks } from '@/components/sections/popular-stocks'
import { PortfolioAnalysis } from '@/components/sections/portfolio-analysis'
import { AssetPerformance } from '@/components/sections/asset-performance'
import { DividendAnalysis } from '@/components/sections/dividend-analysis'
import { CashFlow } from '@/components/sections/cash-flow'
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
  const { users, holdings, transactions, snapshots, stocks, dividends, deposits } = await getDashboardData()

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

      {/* Section 4: 자산 성과 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">자산 성과</h2>
        <AssetPerformance snapshots={snapshots} holdings={holdings} />
      </section>

      {/* Section 5: 배당 분석 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">배당 분석</h2>
        <DividendAnalysis dividends={dividends} users={users} />
      </section>

      {/* Section 6: 입출금 흐름 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">입출금 흐름</h2>
        <CashFlow deposits={deposits} snapshots={snapshots} />
      </section>

      {/* Section 7: 유저 활동 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">유저 활동</h2>
        <UserActivity users={users} transactions={transactions} />
      </section>

      {/* Section 8: 데이터 내보내기 */}
      <section>
        <DataExport holdings={holdings} stocks={stocks} />
      </section>
    </div>
  )
}
