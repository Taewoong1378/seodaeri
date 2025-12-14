import { Skeleton } from "@repo/design-system/components/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          포트폴리오
        </span>
        <div className="flex items-center gap-3">
          {/* Sheet Button Skeleton */}
          <Skeleton className="h-8 w-16 rounded-full bg-muted" />
          {/* Sync Button Skeleton */}
          <Skeleton className="h-8 w-8 rounded-full bg-muted" />
          {/* Profile Skeleton */}
          <Skeleton className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </header>

      <main className="p-5 space-y-6">
        {/* Summary Skeleton */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20 bg-muted rounded" />
            <Skeleton className="h-3 w-16 bg-muted rounded" />
          </div>
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-9 w-40 bg-muted rounded" />
            <Skeleton className="h-4 w-4 bg-muted rounded" />
          </div>
          <div className="flex items-center gap-4 text-sm bg-muted p-3 rounded-xl border border-border">
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-12 bg-muted rounded" />
              <Skeleton className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-10 bg-muted rounded" />
              <Skeleton className="h-5 w-24 bg-muted rounded" />
            </div>
          </div>
        </section>

        {/* Portfolio List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 bg-muted rounded" />
                  <Skeleton className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-4 w-20 bg-muted rounded" />
                <Skeleton className="h-3 w-12 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border h-[84px] pb-6 max-w-[500px] mx-auto">
        <div className="flex justify-around items-center h-full px-2 max-w-[500px] mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-6 w-6 rounded bg-muted" />
              <Skeleton className="h-2 w-8 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
