import { BottomNav } from './components/BottomNav';
import { DashboardSkeleton } from './components/DashboardSkeleton';

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          굴림
        </span>
        <div className="flex items-center gap-3">
          <div className="h-8 w-12 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </header>

      <main className="p-4">
        <DashboardSkeleton />
      </main>

      <BottomNav />
    </div>
  );
}
