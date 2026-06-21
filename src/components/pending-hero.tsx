import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { PendingProposalListItem } from "@/lib/db/queries";
import type { ChangeSeverity } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface Props {
  proposals: PendingProposalListItem[];
  threshold: number;
}

export function PendingHero({ proposals, threshold }: Props) {
  if (proposals.length === 0) {
    return (
      <section className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-sm">
            <span className="font-medium">No patches awaiting review.</span>{" "}
            <span className="text-muted-foreground">Auto-heal is handling everything cleanly.</span>
          </div>
        </div>
        <Link
          href="/proposals"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          View queue
        </Link>
      </section>
    );
  }

  const featured = proposals.slice(0, 3);
  const overflow = proposals.length - featured.length;

  return (
    <section className="overflow-hidden rounded-lg border-l-4 border-l-amber-400 border-y border-r border-y-amber-300/60 border-r-amber-300/60 bg-amber-50/40 shadow-sm dark:border-y-amber-500/30 dark:border-r-amber-500/30 dark:bg-amber-500/5">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="relative inline-flex h-1.5 w-1.5 items-center justify-center"
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            <div className="text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Awaiting review
            </div>
          </div>
          <div className="mt-0.5 text-base font-semibold tracking-tight">
            {proposals.length} {proposals.length === 1 ? "patch needs" : "patches need"} a decision
          </div>
        </div>
        <Link href="/proposals" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
          Open queue
          <ArrowRight />
        </Link>
      </div>
      <ul className="divide-y border-t bg-card">
        {featured.map((p) => (
          <li key={p.id}>
            <Link
              href={`/proposals/${p.id}`}
              className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50"
            >
              <ConfidencePill score={p.confidence_score} threshold={threshold} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium group-hover:text-foreground">
                  {p.content_title}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span>{p.source_name}</span>
                  {p.severity && (
                    <>
                      <span aria-hidden>·</span>
                      <SeverityWord severity={p.severity} />
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </li>
        ))}
        {overflow > 0 && (
          <li className="px-4 py-2 text-center">
            <Link
              href="/proposals"
              className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              + {overflow} more in queue
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}

function ConfidencePill({ score, threshold }: { score: number; threshold: number }) {
  const tone =
    score < 0.5
      ? "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300"
      : score < threshold
        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300";
  return (
    <span
      className={cn(
        "flex h-8 w-11 shrink-0 items-center justify-center rounded text-xs font-semibold tabular-nums",
        tone,
      )}
    >
      {score.toFixed(2)}
    </span>
  );
}

const SEVERITY_TONE: Record<ChangeSeverity, string> = {
  trivial: "text-emerald-700 dark:text-emerald-400",
  minor: "text-amber-700 dark:text-amber-400",
  major: "text-rose-700 dark:text-rose-400",
};

function SeverityWord({ severity }: { severity: ChangeSeverity }) {
  return (
    <span className={cn("font-medium uppercase tracking-wide", SEVERITY_TONE[severity])}>
      {severity}
    </span>
  );
}
