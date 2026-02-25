import { BottomNav } from '../dashboard/components/BottomNav';
import { TransactionsSkeleton } from './components/TransactionsSkeleton';

export default function TransactionsLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-5 h-14 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">내역</span>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        </div>
      </header>

      <main className="p-5 space-y-4">
        <TransactionsSkeleton />
      </main>

      <BottomNav />
    </div>
  );
}
