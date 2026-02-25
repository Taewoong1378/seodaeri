import { BottomNav } from '../dashboard/components/BottomNav';

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center">
        <span className="font-bold text-lg tracking-tight text-foreground">
          설정
        </span>
      </header>

      <main className="p-5 space-y-6">
        {/* Profile skeleton */}
        <div className="bg-card border border-border rounded-[24px] p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-5 w-24 bg-muted rounded" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          </div>
        </div>

        {/* Menu skeleton */}
        <div className="bg-card border border-border rounded-[24px] animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 border-b border-border last:border-b-0"
            >
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-3 w-40 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Logout skeleton */}
        <div className="h-12 bg-muted rounded-[24px] animate-pulse" />
      </main>

      <BottomNav />
    </div>
  );
}
