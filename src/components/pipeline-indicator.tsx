import { Check, X } from "lucide-react";
import type { ProposalStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface Props {
  proposalStatus: ProposalStatus;
}

type StageState = "done" | "current" | "skipped" | "rejected" | "future" | "blocked";

interface Stage {
  label: string;
  state: StageState;
}

const STAGE_LABELS = ["Detected", "Analyzed", "Proposed", "Review", "Published"] as const;

function stagesFor(status: ProposalStatus): Stage[] {
  // Detected / Analyzed / Proposed are always reached once a proposal row exists.
  const states: StageState[] = ["done", "done", "done", "future", "future"];

  switch (status) {
    case "pending":
      states[3] = "current";
      break;
    case "auto_published":
      states[3] = "skipped"; // bypassed by the auto-heal gate
      states[4] = "done";
      break;
    case "approved":
      states[3] = "done";
      states[4] = "done";
      break;
    case "rejected":
      states[3] = "rejected";
      states[4] = "blocked";
      break;
    case "superseded":
      states[3] = "skipped";
      states[4] = "blocked";
      break;
  }

  return STAGE_LABELS.map((label, i) => ({ label, state: states[i] }));
}

const STAGE_HINT: Record<ProposalStatus, string> = {
  pending: "Awaiting reviewer decision.",
  auto_published: "Confidence cleared the auto-heal threshold; published without review.",
  approved: "Approved by reviewer and published.",
  rejected: "Rejected by reviewer; content was not changed.",
  superseded: "A newer proposal replaced this one before it was reviewed.",
};

export function PipelineIndicator({ proposalStatus }: Props) {
  const stages = stagesFor(proposalStatus);
  return (
    <div className="space-y-2">
      <ol className="flex items-center">
        {stages.map((stage, i) => (
          <li key={stage.label} className="flex flex-1 items-center">
            <StageNode stage={stage} />
            {i < stages.length - 1 && (
              <Connector from={stage.state} to={stages[i + 1].state} />
            )}
          </li>
        ))}
      </ol>
      <p className="text-[11px] text-muted-foreground">{STAGE_HINT[proposalStatus]}</p>
    </div>
  );
}

function StageNode({ stage }: { stage: Stage }) {
  const { dot, label } = nodeClasses(stage.state);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
          dot,
        )}
        aria-hidden
      >
        {stage.state === "done" && <Check className="h-3 w-3" />}
        {stage.state === "rejected" && <X className="h-3 w-3" />}
        {stage.state === "current" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={cn("whitespace-nowrap text-[10px] uppercase tracking-wider", label)}>
        {stage.label}
      </span>
    </div>
  );
}

function Connector({ from, to }: { from: StageState; to: StageState }) {
  // Color the connector by the *incoming* stage so the eye reads progress.
  const color =
    from === "done"
      ? "bg-emerald-500/60"
      : from === "rejected"
        ? "bg-rose-300"
        : from === "current"
          ? "bg-primary/40"
          : "bg-border";
  const dashed = to === "blocked" || to === "future" || from === "skipped";
  return (
    <span
      aria-hidden
      className={cn(
        "mx-2 h-px flex-1 -translate-y-2",
        dashed ? "border-t border-dashed border-border bg-transparent" : color,
      )}
    />
  );
}

function nodeClasses(state: StageState): { dot: string; label: string } {
  switch (state) {
    case "done":
      return {
        dot: "border-emerald-500 bg-emerald-500 text-white",
        label: "text-foreground",
      };
    case "current":
      return {
        dot: "border-primary bg-primary/10 text-primary ring-4 ring-primary/15",
        label: "font-semibold text-primary",
      };
    case "rejected":
      return {
        dot: "border-rose-500 bg-rose-500 text-white",
        label: "text-rose-700 dark:text-rose-400",
      };
    case "skipped":
      return {
        dot: "border-muted-foreground/40 bg-background text-muted-foreground",
        label: "text-muted-foreground/80",
      };
    case "blocked":
      return {
        dot: "border-dashed border-muted-foreground/30 bg-background text-muted-foreground/60",
        label: "text-muted-foreground/60",
      };
    case "future":
      return {
        dot: "border-muted-foreground/40 bg-background text-muted-foreground/60",
        label: "text-muted-foreground/70",
      };
  }
}
