import { BottomNav } from '../dashboard/components/BottomNav';
import { PortfolioSkeleton } from './components/PortfolioSkeleton';

export default function PortfolioLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight text-foreground">
          포트폴리오
        </span>
        <div className="flex items-center gap-3">
          <div className="h-8 w-12 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </header>

      <main className="p-5 space-y-6">
        <PortfolioSkeleton />
      </main>

      <BottomNav />
    </div>
  );
}
