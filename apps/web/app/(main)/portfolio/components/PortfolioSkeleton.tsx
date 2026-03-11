export function PortfolioSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Summary section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-3 w-14 bg-muted rounded" />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="h-9 w-28 bg-muted rounded" />
          <div className="h-4 w-6 bg-muted rounded" />
        </div>
        {/* Stats bar (투자원금 | 수익금) */}
        <div className="flex items-center gap-4 bg-card p-4 rounded-[20px] border border-border">
          <div className="flex flex-col gap-1">
            <div className="h-2.5 w-12 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="flex flex-col gap-1">
            <div className="h-2.5 w-10 bg-muted rounded" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        </div>
      </section>

      {/* BenefitBanner placeholder */}
      <div className="h-16 bg-card border border-border rounded-[20px]" />

      {/* Holdings list */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 bg-card border border-border rounded-[20px]"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="space-y-1.5">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-3 w-14 bg-muted rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="h-4 w-16 bg-muted rounded" />
              <div className="h-3 w-10 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
