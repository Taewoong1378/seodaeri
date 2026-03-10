import { SectionCard } from '@/components/section-card'
import { CsvDownloadButton } from '@/components/csv-download-button'

export function DataExport() {
  return (
    <SectionCard title="데이터 내보내기" description="CSV 형식으로 다운로드">
      <div className="flex flex-wrap gap-3">
        <CsvDownloadButton type="users" label="사용자 목록" />
        <CsvDownloadButton type="holdings" label="전체 보유종목" />
        <CsvDownloadButton type="popular-stocks" label="인기종목 TOP" />
      </div>
    </SectionCard>
  )
}
