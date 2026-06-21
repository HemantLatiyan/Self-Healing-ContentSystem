import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { listPendingProposals } from "@/lib/db/queries";
import { env } from "@/lib/env";
import type { ChangeSeverity } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProposalsListPage() {
  const proposals = await listPendingProposals();
  const threshold = env.AUTO_HEAL_THRESHOLD();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="space-y-1 border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reviewer queue</h1>
        <p className="text-sm text-muted-foreground">
          {proposals.length === 0
            ? "Nothing awaiting review. Auto-heal is handling everything cleanly."
            : `${proposals.length} ${proposals.length === 1 ? "patch needs" : "patches need"} a decision. Sorted by lowest confidence first.`}
        </p>
      </header>

      {proposals.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed py-16 text-center text-sm text-muted-foreground">
          You&apos;re all caught up.
        </div>
      ) : (
        <ul className="mt-6 divide-y rounded-md border bg-card">
          {proposals.map((p) => (
            <li key={p.id}>
              <Link
                href={`/proposals/${p.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40"
              >
                <ConfidenceChip score={p.confidence_score} threshold={threshold} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{p.content_title}</span>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {p.content_type}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{p.source_name}</span>
                    {p.severity && (
                      <>
                        <span aria-hidden>·</span>
                        <SeverityChip severity={p.severity} />
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ConfidenceChip({ score, threshold }: { score: number; threshold: number }) {
  const tone =
    score < 0.5
      ? "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300"
      : score < threshold
        ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
        : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300";
  return (
    <div
      className={cn(
        "flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded border text-center",
        tone,
      )}
    >
      <span className="text-xs font-semibold tabular-nums leading-none">
        {score.toFixed(2)}
      </span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/80">
        conf
      </span>
    </div>
  );
}

const SEVERITY_STYLE: Record<ChangeSeverity, string> = {
  trivial: "text-emerald-700 dark:text-emerald-400",
  minor: "text-amber-700 dark:text-amber-400",
  major: "text-rose-700 dark:text-rose-400",
};

function SeverityChip({ severity }: { severity: ChangeSeverity }) {
  return (
    <span className={cn("font-medium uppercase tracking-wide", SEVERITY_STYLE[severity])}>
      {severity}
    </span>
  );
}
