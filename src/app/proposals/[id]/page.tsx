import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApproveReject } from "@/components/approve-reject";
import { ConfidenceBreakdownTable } from "@/components/confidence-breakdown";
import { DiffView } from "@/components/diff-view";
import { PipelineIndicator } from "@/components/pipeline-indicator";
import { SplitDiffView } from "@/components/split-diff-view";
import { env } from "@/lib/env";
import { getProposalDetail } from "@/lib/db/queries";
import type { ChangeSeverity } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const proposal_id = Number(id);
  if (!Number.isInteger(proposal_id)) notFound();

  const detail = await getProposalDetail(proposal_id);
  if (!detail) notFound();

  const { proposal, content_title, content_type, source_name, source_location, source_diff, change_set } = detail;
  const threshold = env.AUTO_HEAL_THRESHOLD();
  const decided = proposal.status !== "pending";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <Link
        href="/proposals"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to reviewer queue
      </Link>

      <header className="mt-3 space-y-5 border-b pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">Proposal #{proposal.id}</span>
            <span>·</span>
            <span>{source_name}</span>
            <span>·</span>
            <span>change set #{change_set.id}</span>
            <span>·</span>
            <span>{formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true })}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{content_title}</h1>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {content_type}
            </Badge>
            {change_set.severity && <SeverityBadge severity={change_set.severity} />}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase",
                decided && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {proposal.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <PipelineIndicator proposalStatus={proposal.status} />
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-8">
          {change_set.semantic_summary && (
            <section className="rounded-md border-l-2 border-l-primary/40 bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Why this proposal exists
              </div>
              <p className="mt-1 text-sm leading-relaxed">{change_set.semantic_summary}</p>
              {change_set.changed_concepts && change_set.changed_concepts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {change_set.changed_concepts.map((c) => (
                    <span
                      key={c}
                      className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Content diff</h2>
            <SplitDiffView before={proposal.old_body} after={proposal.proposed_body} />
          </section>

          <section className="space-y-3">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between rounded-md border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  Source change
                  <span className="font-mono text-[10px] text-muted-foreground">{source_location}</span>
                </span>
                <span className="text-xs text-muted-foreground group-open:hidden">show</span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">hide</span>
              </summary>
              <div className="mt-3">
                <DiffView before={source_diff.prev_text} after={source_diff.new_text} mode="lines" />
              </div>
            </details>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <ConfidenceBreakdownTable
            score={proposal.confidence_score}
            threshold={threshold}
            breakdown={proposal.confidence_breakdown}
          />

          {decided ? (
            <DecisionRecap proposal={proposal} />
          ) : (
            <ApproveReject proposalId={proposal.id} proposedBody={proposal.proposed_body} />
          )}
        </aside>
      </div>
    </main>
  );
}

function DecisionRecap({ proposal }: { proposal: Awaited<ReturnType<typeof getProposalDetail>> extends infer T ? T extends { proposal: infer P } ? P : never : never }) {
  const status = (proposal as { status: string }).status;
  const reviewer = (proposal as { reviewer_id: string | null }).reviewer_id;
  const at = (proposal as { reviewed_at: string | null }).reviewed_at;
  const notes = (proposal as { review_notes: string | null }).review_notes;
  return (
    <div className="rounded-md border bg-muted/30 p-4 text-xs">
      <div className="text-muted-foreground">
        This proposal is <span className="font-medium text-foreground">{status.replace("_", " ")}</span>.
      </div>
      {reviewer && (
        <div className="mt-1 text-muted-foreground">
          by <span className="font-mono text-foreground">{reviewer}</span>
          {at && <> · {formatDistanceToNow(new Date(at), { addSuffix: true })}</>}
        </div>
      )}
      {notes && <p className="mt-2 italic">{notes}</p>}
    </div>
  );
}

const SEVERITY_STYLE: Record<ChangeSeverity, string> = {
  trivial: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  minor: "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  major: "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

function SeverityBadge({ severity }: { severity: ChangeSeverity }) {
  return (
    <Badge variant="outline" className={cn("text-[10px] uppercase", SEVERITY_STYLE[severity])}>
      {severity}
    </Badge>
  );
}
