import { Card, CardContent } from '@repo/design-system/components/card';
import { Skeleton } from '@repo/design-system/components/skeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 pb-24">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-white">서대리</span>
        <div className="flex items-center gap-3">
          {/* Sheet Button Skeleton */}
          <Skeleton className="h-8 w-16 rounded-full bg-white/5" />
          {/* Sync Button Skeleton */}
          <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
          {/* Profile Skeleton */}
          <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
        </div>
      </header>

      <main className="p-5 space-y-8">
        {/* Hero Section Skeleton */}
        <section>
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1a1f35] to-[#0f1225] border border-white/5 p-6 md:p-8">
            <div className="flex flex-col gap-1 mb-6">
              <Skeleton className="h-4 w-20 bg-white/5 rounded" />
              <Skeleton className="h-10 w-48 bg-white/5 rounded mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-3 w-16 bg-white/5 rounded mb-2" />
                <Skeleton className="h-6 w-24 bg-white/5 rounded" />
              </div>
              <div>
                <Skeleton className="h-3 w-16 bg-white/5 rounded mb-2" />
                <Skeleton className="h-6 w-24 bg-white/5 rounded" />
              </div>
            </div>
          </div>
        </section>

        {/* Account Trend Chart Skeleton */}
        <section>
          <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 bg-white/5 rounded" />
                  <Skeleton className="h-3 w-24 bg-white/5 rounded" />
                </div>
              </div>
              <Skeleton className="h-[200px] w-full bg-white/5 rounded-xl" />
            </CardContent>
          </Card>
        </section>

        {/* Performance Comparison Chart Skeleton */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-5 w-24 bg-white/5 rounded" />
            <Skeleton className="h-4 w-16 bg-white/5 rounded" />
          </div>
          <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="p-6">
              <Skeleton className="h-[200px] w-full bg-white/5 rounded-xl" />
            </CardContent>
          </Card>
        </section>

        {/* Portfolio Charts Skeleton */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-5 w-24 bg-white/5 rounded" />
            <Skeleton className="h-4 w-16 bg-white/5 rounded" />
          </div>

          {/* Donut Chart Skeleton */}
          <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-4">
                <Skeleton className="h-48 w-48 rounded-full bg-white/5" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full bg-white/5" />
                    <Skeleton className="h-3 w-20 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holdings Chart Skeleton */}
          <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24 bg-white/5 rounded" />
                <Skeleton className="h-3 w-12 bg-white/5 rounded" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20 bg-white/5 rounded" />
                        <Skeleton className="h-2 w-12 bg-white/5 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-24 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Quick Stats Summary Skeleton */}
        <section>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-[20px] p-5 backdrop-blur-sm">
                <Skeleton className="h-3 w-20 bg-white/5 rounded mb-2" />
                <Skeleton className="h-6 w-32 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* Dividend Chart Skeleton */}
        <section>
          <Card className="border-white/5 bg-white/[0.02] shadow-none rounded-[24px] overflow-hidden">
            <CardContent className="pt-6 pb-6 px-6">
              <Skeleton className="h-[200px] w-full bg-white/5 rounded-xl" />
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Bottom Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-t border-white/5 h-[84px] pb-6">
        <div className="flex justify-around items-center h-full px-2 max-w-[430px] mx-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="h-6 w-6 rounded bg-white/5" />
              <Skeleton className="h-2 w-8 rounded bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
