import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScanButton } from "@/components/scan-button";
import { ProcessButton } from "@/components/process-button";
import { PendingHero } from "@/components/pending-hero";
import { ActivityList, type ActivityItem } from "@/components/activity-list";
import {
  listPendingProposals,
  listRecentAudit,
  listRecentChangeSets,
  listSources,
} from "@/lib/db/queries";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [sources, pending, changeSets, audit] = await Promise.all([
    listSources(),
    listPendingProposals(),
    listRecentChangeSets(),
    listRecentAudit(50),
  ]);
  const threshold = env.AUTO_HEAL_THRESHOLD();

  const inFlight = changeSets.filter(
    (c) => c.status !== "done" && c.status !== "failed",
  ).length;
  const autoHealed = audit.filter((a) => a.action === "auto_publish").length;

  // Merge change_sets and audit into a single activity stream, newest first.
  const activity: ActivityItem[] = [
    ...changeSets.map<ActivityItem>((c) => ({ kind: "change_set", at: c.created_at, data: c })),
    ...audit.map<ActivityItem>((a) => ({ kind: "audit", at: a.created_at, data: a })),
  ].sort((a, b) => (a.at > b.at ? -1 : 1));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <ScanButton />
          <ProcessButton />
        </div>
      </header>

      <PendingHero proposals={pending} threshold={threshold} />

      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-md border bg-border text-center sm:grid-cols-4">
        <Stat label="Sources" value={sources.length} />
        <Stat label="In flight" value={inFlight} tone={inFlight > 0 ? "amber" : "neutral"} />
        <Stat label="Auto-healed" value={autoHealed} tone="emerald" />
        <Stat
          label="Awaiting review"
          value={pending.length}
          tone={pending.length > 0 ? "amber" : "neutral"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sources
          </h2>
          <ul className="divide-y rounded-md border bg-card text-sm">
            {sources.map((s) => (
              <li key={s.id} className="space-y-1 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase">
                    {s.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span className="truncate font-mono">{s.location}</span>
                  <span className="shrink-0 font-mono">
                    {s.latest_hash ? s.latest_hash.slice(0, 8) : "—"}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Activity
          </h2>
          <ActivityList items={activity} initialLimit={4} />
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "amber" | "emerald";
}) {
  const toneCls =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : "text-foreground";
  return (
    <div className="bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-lg font-semibold leading-tight tabular-nums", toneCls)}>
        {value}
      </div>
    </div>
  );
}
