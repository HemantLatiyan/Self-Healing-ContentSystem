export default function ProposalDetailLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Block className="h-3 w-32" />

      <header className="mt-3 space-y-5 border-b pb-6">
        <div className="space-y-2">
          <Block className="h-3 w-72" />
          <Block className="h-7 w-2/3" />
          <div className="flex items-center gap-2 pt-1">
            <Block className="h-5 w-16 rounded-full" />
            <Block className="h-5 w-16 rounded-full" />
            <Block className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <Block className="h-6 w-6 rounded-full" />
              <Block className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          <Block className="h-24 rounded-md" />
          <div className="space-y-3">
            <Block className="h-4 w-24" />
            <Block className="h-64 rounded-md" />
          </div>
          <Block className="h-10 rounded-md" />
        </div>
        <aside className="space-y-6">
          <Block className="h-32 rounded-md" />
          <Block className="h-40 rounded-md" />
          <Block className="h-32 rounded-md" />
        </aside>
      </div>
    </main>
  );
}

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted/60 ${className ?? ""}`} />;
}
