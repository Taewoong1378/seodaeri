import { Card, CardContent } from "@repo/design-system/components/card";
import { Skeleton } from "@repo/design-system/components/skeleton";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center">
        <span className="font-bold text-lg tracking-tight text-foreground">
          설정
        </span>
      </header>

      <main className="p-5 space-y-6">
        {/* Profile Section Skeleton */}
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full bg-muted" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 bg-muted rounded" />
                <Skeleton className="h-4 w-48 bg-muted rounded" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Menu Skeleton */}
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 bg-muted rounded" />
                  <Skeleton className="h-3 w-40 bg-muted rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-5 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>

        {/* Logout Button Skeleton */}
        <Skeleton className="w-full h-14 rounded-[16px] bg-muted" />

        {/* App Info Skeleton */}
        <div className="flex flex-col items-center gap-1 pt-4">
          <Skeleton className="h-3 w-20 bg-muted rounded" />
          <Skeleton className="h-3 w-32 bg-muted rounded" />
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
