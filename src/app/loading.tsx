export default function DashboardLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <Block className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Block className="h-8 w-24" />
          <Block className="h-8 w-28" />
        </div>
      </header>

      <Block className="h-32 w-full rounded-lg" />

      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border bg-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5 bg-card px-3 py-3">
            <Block className="h-3 w-16" />
            <Block className="h-5 w-10" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Block className="h-48 rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="h-12 rounded border" />
          ))}
        </div>
      </div>
    </main>
  );
}

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className ?? ""}`} />;
}
