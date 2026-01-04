import { Skeleton } from "@repo/design-system/components/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 animate-pulse">
        {/* Logo Skeleton */}
        <div className="text-center mb-8">
          <Skeleton className="h-12 w-32 bg-muted rounded mx-auto mb-2" />
          <Skeleton className="h-4 w-48 bg-muted rounded mx-auto" />
        </div>

        {/* Card 1 Skeleton */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-40 bg-muted rounded" />
              <Skeleton className="h-3 w-56 bg-muted rounded" />
            </div>
          </div>
          <Skeleton className="h-11 w-full bg-muted rounded-lg" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <Skeleton className="h-3 w-20 bg-muted rounded" />
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Card 2 Skeleton */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32 bg-muted rounded" />
              <Skeleton className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
          <Skeleton className="h-11 w-full bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

