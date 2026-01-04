import { Skeleton } from "@repo/design-system/components/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          대시보드
        </span>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-16 rounded-full bg-muted" />
          <Skeleton className="h-8 w-8 rounded-full bg-muted" />
          <Skeleton className="h-8 w-8 rounded-full bg-muted" />
        </div>
      </header>

      <main className="p-5 space-y-6">
        {/* Hero Section Skeleton */}
        <section>
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary/10 to-primary/5 border border-border p-6 animate-pulse">
            <div className="flex flex-col gap-1 mb-6">
              <Skeleton className="h-4 w-20 bg-muted rounded" />
              <Skeleton className="h-10 w-48 bg-muted rounded mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-3 w-16 bg-muted rounded mb-2" />
                <Skeleton className="h-6 w-24 bg-muted rounded" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 bg-muted rounded mb-2" />
                <Skeleton className="h-6 w-24 bg-muted rounded" />
              </div>
            </div>
          </div>
        </section>

        {/* Chart Skeleton */}
        <section className="bg-card border border-border rounded-[24px] p-6">
          <div className="flex items-center justify-between mb-6 animate-pulse">
            <div className="space-y-1">
              <Skeleton className="h-4 w-32 bg-muted rounded" />
              <Skeleton className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
          <Skeleton className="h-[200px] w-full bg-muted rounded-xl" />
        </section>

        {/* Stats Grid Skeleton */}
        <section className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-[20px] p-5 animate-pulse">
              <Skeleton className="h-3 w-20 bg-muted rounded mb-2" />
              <Skeleton className="h-6 w-32 bg-muted rounded" />
            </div>
          ))}
        </section>

        {/* Another Chart Skeleton */}
        <section className="bg-card border border-border rounded-[24px] p-6">
          <Skeleton className="h-[200px] w-full bg-muted rounded-xl" />
        </section>
      </main>

      {/* Bottom Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border h-[84px] pb-6 max-w-[500px] mx-auto">
        <div className="flex justify-around items-center h-full px-2 max-w-[500px] mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 animate-pulse">
              <Skeleton className="h-6 w-6 rounded bg-muted" />
              <Skeleton className="h-2 w-8 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

