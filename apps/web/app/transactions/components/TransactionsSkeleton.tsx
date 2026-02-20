export function TransactionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl p-4 flex items-center justify-between animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-3 w-12 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
