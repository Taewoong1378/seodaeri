import { Card, CardContent } from "@repo/design-system/components/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* SmallBannerCarousel placeholder */}
      <div className="rounded-[20px] bg-muted/60 h-[76px] animate-pulse" />

      {/* HeroCard placeholder */}
      <div className="rounded-[24px] shadow-sm border border-border bg-card">
        <div className="p-6 space-y-6 animate-pulse">
          {/* Header: icon + label + big number */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50" />
              <div className="h-4 w-12 bg-muted rounded" />
            </div>
            <div className="h-10 w-48 bg-muted rounded" />
          </div>

          {/* Goal progress placeholder */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-3 w-10 bg-muted rounded" />
              </div>
              <div className="w-full h-2 bg-muted rounded-full" />
            </div>
          </div>

          {/* Stats Grid 2x2 */}
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border/50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-14 bg-muted rounded" />
                <div className="h-5 w-28 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DashboardTabs placeholder */}
      <div className="space-y-4">
        {/* Tab bar */}
        <div className="flex gap-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-9 rounded-full ${i === 1 ? "w-24 bg-primary/10" : "w-20 bg-muted"}`}
            />
          ))}
        </div>

        {/* Chart card */}
        <Card className="border-border bg-card shadow-sm rounded-[24px] overflow-hidden">
          <CardContent className="p-4">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
              <div className="h-[200px] w-full bg-muted/60 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
