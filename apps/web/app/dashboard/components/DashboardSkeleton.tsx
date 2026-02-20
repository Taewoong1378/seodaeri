import { Card, CardContent } from "@repo/design-system/components/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section>
        <div className="relative overflow-hidden rounded-[32px] bg-linear-to-br from-primary/20 to-primary/5 border border-border p-6 md:p-8 animate-pulse">
          <div className="flex flex-col gap-1 mb-6">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-10 w-48 bg-muted rounded mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
            <div>
              <div className="h-3 w-16 bg-muted rounded mb-2" />
              <div className="h-6 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-6 animate-pulse">
              <div className="space-y-1">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </div>
            <div className="h-[200px] w-full bg-muted rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1 animate-pulse">
          <div className="h-5 w-24 bg-muted rounded" />
          <div className="h-4 w-16 bg-muted rounded" />
        </div>
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="p-4">
            <div className="h-[200px] w-full bg-muted rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="grid grid-cols-2 gap-4 animate-pulse">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-[20px] p-5 backdrop-blur-sm"
            >
              <div className="h-3 w-20 bg-muted rounded mb-2" />
              <div className="h-6 w-32 bg-muted rounded" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <Card className="border-border bg-card shadow-none rounded-[24px] overflow-hidden">
          <CardContent className="pt-6 pb-6 px-6">
            <div className="h-[200px] w-full bg-muted rounded-xl animate-pulse" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
