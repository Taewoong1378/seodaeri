import { SectionCard } from '@/components/section-card'
import { CsvDownloadButton } from '@/components/csv-download-button'

export function DataExport() {
  return (
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
  )
}
