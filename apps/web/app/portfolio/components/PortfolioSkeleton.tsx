export function PortfolioSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-3 w-12 bg-muted rounded" />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="h-10 w-32 bg-muted rounded" />
        </div>
        <div className="h-20 bg-muted rounded-[20px]" />
      </section>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-[24px]" />
        ))}
      </div>
    </div>
  );
}
