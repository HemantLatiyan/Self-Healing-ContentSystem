import type { ConfidenceBreakdown } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  threshold: number;
  breakdown: ConfidenceBreakdown;
}

type Band = "low" | "medium" | "high";

interface BandSpec {
  label: string;
  description: string;
  tone: string;
  dot: string;
}

function bandFor(score: number, threshold: number): { band: Band; spec: BandSpec } {
  if (score >= threshold) {
    return {
      band: "high",
      spec: {
        label: "High confidence",
        description:
          "At or above the auto-heal threshold. This patch would publish automatically in production.",
        tone: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100",
        dot: "bg-emerald-500",
      },
    };
  }
  // Medium covers the upper half of the gap below threshold; Low everything else.
  const mediumFloor = Math.max(0.5, threshold - 0.2);
  if (score >= mediumFloor) {
    return {
      band: "medium",
      spec: {
        label: "Medium confidence",
        description:
          "Below the auto-heal threshold but well-supported. A quick review is recommended.",
        tone: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100",
        dot: "bg-amber-500",
      },
    };
  }
  return {
    band: "low",
    spec: {
      label: "Low confidence",
      description:
        "Significant uncertainty. Read the diff carefully before approving.",
      tone: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100",
      dot: "bg-rose-500",
    },
  };
}

const ROWS: Array<{
  key: keyof ConfidenceBreakdown;
  label: string;
  weight: number;
  hint: string;
  invert?: boolean;
}> = [
  {
    key: "model_self_score",
    label: "Model self-score",
    weight: 0.3,
    hint: "How confident the model claimed to be.",
  },
  {
    key: "patch_size_ratio",
    label: "Patch scope",
    weight: 0.25,
    hint: "Smaller rewrites score higher.",
    invert: true,
  },
  {
    key: "severity_factor",
    label: "Severity adjustment",
    weight: 0.25,
    hint: "trivial 1.0 · minor 0.7 · major 0.3",
  },
  {
    key: "citation_overlap",
    label: "Citation overlap",
    weight: 0.2,
    hint: "Concepts the patch cites that belong to this source.",
  },
];

export function ConfidenceBreakdownTable({ score, threshold, breakdown }: Props) {
  const { spec } = bandFor(score, threshold);
  return (
    <div className="space-y-4">
      <div className={cn("rounded-md border px-4 py-3", spec.tone)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", spec.dot)} aria-hidden />
          <span className="text-sm font-semibold">{spec.label}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed opacity-90">{spec.description}</p>
        <div className="mt-2 text-[11px] tabular-nums opacity-75">
          Score {score.toFixed(2)} · auto-heal at {threshold.toFixed(2)}
        </div>
      </div>

      <details className="group rounded-md border bg-card">
        <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/40">
          <span>How this score was computed</span>
          <span className="text-muted-foreground group-open:hidden">show</span>
          <span className="hidden text-muted-foreground group-open:inline">hide</span>
        </summary>
        <div className="border-t">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Signal</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-right font-medium">×</th>
                <th className="px-3 py-2 text-right font-medium">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ROWS.map((row) => {
                const raw = breakdown[row.key] as number;
                const inputValue = row.invert ? 1 - raw : raw;
                const contribution = row.weight * inputValue;
                return (
                  <tr key={row.key}>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-foreground">{row.label}</div>
                      <div className="text-[11px] text-muted-foreground">{row.hint}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {raw.toFixed(3)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-muted-foreground">
                      {row.weight.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      {contribution.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {breakdown.cited_concepts.length > 0 && (
            <div className="space-y-1 border-t px-3 py-2 text-xs">
              <div className="text-muted-foreground">Cited concepts</div>
              <div className="flex flex-wrap gap-1.5">
                {breakdown.cited_concepts.map((c) => {
                  const matched = breakdown.matched_concepts.includes(c);
                  return (
                    <span
                      key={c}
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[10px]",
                        matched
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                          : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300",
                      )}
                    >
                      {c}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <p className="border-t px-3 py-2 text-xs italic text-muted-foreground">
            {breakdown.reasoning}
          </p>
        </div>
      </details>
    </div>
  );
}
