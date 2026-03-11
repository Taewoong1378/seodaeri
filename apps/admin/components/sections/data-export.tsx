import { SectionCard } from '@/components/section-card'
import { CsvDownloadButton } from '@/components/csv-download-button'
import type { Database } from '@repo/database'

type Holding = Database['public']['Tables']['holdings']['Row']

interface DataExportProps {
  holdings: Holding[]
  stocks: { code: string }[]
}

// 대안 자산 / 사용자 커스텀 입력 (stocks 테이블에 없는 게 정상)
const KNOWN_NON_STOCK_TICKERS = new Set([
  'CASH', 'GOLD', 'BTC', 'ETH', 'XRP', 'SOL_CRYPTO', 'BTCKRW', '현금',
])

export function DataExport({ holdings, stocks }: DataExportProps) {
  // holdings에는 있지만 stocks 테이블에 없는 ticker 찾기 (대소문자 무시)
  const stockCodes = new Set(stocks.map(s => s.code.toUpperCase()))
  const holdingTickers = new Map<string, number>()
  for (const h of holdings) {
    if (!h.ticker) continue
    const upper = h.ticker.toUpperCase()
    if (KNOWN_NON_STOCK_TICKERS.has(upper)) continue
    if (!stockCodes.has(upper)) {
      // 원본 ticker로 표시
      const displayTicker = h.ticker
      holdingTickers.set(displayTicker, (holdingTickers.get(displayTicker) ?? 0) + 1)
    }
  }
  const missingStocks = Array.from(holdingTickers.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([ticker, count]) => ({ ticker, count }))

  return (
    <div className="space-y-6">
      <SectionCard title="데이터 내보내기" description="CSV 형식으로 다운로드">
        <div className="flex flex-wrap gap-3">
          <CsvDownloadButton type="users" label="사용자 목록" />
          <CsvDownloadButton type="holdings" label="전체 보유종목" />
          <CsvDownloadButton type="popular-stocks" label="인기종목 TOP" />
          <CsvDownloadButton type="dividends" label="배당 내역" />
          <CsvDownloadButton type="deposits" label="입출금 내역" />
          <CsvDownloadButton type="snapshots" label="포트폴리오 스냅샷" />
        </div>
      </SectionCard>

      {missingStocks.length > 0 && (
        <SectionCard
          title="누락 종목 알림"
          description="유저가 보유 중이지만 stocks 테이블에 등록되지 않은 종목 (검색 불가)"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">티커</th>
                  <th className="pb-2 pr-4 font-medium">보유자 수</th>
                </tr>
              </thead>
              <tbody>
                {missingStocks.map(({ ticker, count }) => (
                  <tr key={ticker} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-mono font-semibold text-red-600">{ticker}</td>
                    <td className="py-2 pr-4 text-gray-700">{count}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            이 종목들은 종목 검색에서 나타나지 않습니다. 미국 종목 동기화를 다시 실행하거나, 수동으로 추가해주세요.
          </p>
        </SectionCard>
      )}
    </div>
  )
}
