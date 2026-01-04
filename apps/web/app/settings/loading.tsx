import { Skeleton } from "@repo/design-system/components/skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          설정
        </span>
      </header>

      <main className="p-5 space-y-4">
        {/* Profile Section Skeleton */}
        <div className="bg-card border border-border rounded-[24px] p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 bg-muted rounded" />
              <Skeleton className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        </div>

        {/* Menu Items Skeleton */}
        <div className="bg-card border border-border rounded-[24px] overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 flex items-center justify-between border-b border-border last:border-0 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl bg-muted" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 bg-muted rounded" />
                  <Skeleton className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-5 bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Logout Button Skeleton */}
        <div className="mt-8 animate-pulse">
          <Skeleton className="h-12 w-full bg-muted rounded-xl" />
        </div>
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

