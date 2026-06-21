import { diffLines, diffWordsWithSpace, type Change } from "diff";
import { cn } from "@/lib/utils";

interface Props {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

type Row =
  | { kind: "unchanged"; before: string; after: string }
  | { kind: "removed"; before: string }
  | { kind: "added"; after: string }
  | { kind: "modified"; before: string; after: string };

/**
 * Line-aligned before/after diff. Modified rows show word-level highlights
 * within each cell so the reviewer's eye can land directly on the substantive
 * change without scanning whole lines.
 */
export function SplitDiffView({
  before,
  after,
  beforeLabel = "Current",
  afterLabel = "Proposed",
  className,
}: Props) {
  const rows = buildRows(before, after);
  return (
    <div className={cn("overflow-hidden rounded-md border bg-card", className)}>
      <div className="grid grid-cols-2 divide-x border-b bg-muted/30 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <div className="px-3 py-1.5">{beforeLabel}</div>
        <div className="px-3 py-1.5">{afterLabel}</div>
      </div>
      <div className="grid grid-cols-2 divide-x">
        <DiffColumn rows={rows} side="before" />
        <DiffColumn rows={rows} side="after" />
      </div>
    </div>
  );
}

function DiffColumn({ rows, side }: { rows: Row[]; side: "before" | "after" }) {
  return (
    <div className="font-sans text-[13px] leading-relaxed">
      {rows.map((row, i) => (
        <RowCell key={i} row={row} side={side} />
      ))}
    </div>
  );
}

function RowCell({ row, side }: { row: Row; side: "before" | "after" }) {
  if (row.kind === "unchanged") {
    return (
      <div className="whitespace-pre-wrap break-words px-3 py-0.5 text-muted-foreground">
        {row[side] || " "}
      </div>
    );
  }
  if (row.kind === "removed") {
    if (side === "after") return <EmptyRow tone="removed" />;
    return (
      <div className="whitespace-pre-wrap break-words bg-rose-100/60 px-3 py-0.5 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200">
        {row.before || " "}
      </div>
    );
  }
  if (row.kind === "added") {
    if (side === "before") return <EmptyRow tone="added" />;
    return (
      <div className="whitespace-pre-wrap break-words bg-emerald-100/60 px-3 py-0.5 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">
        {row.after || " "}
      </div>
    );
  }
  // modified
  return <ModifiedCell before={row.before} after={row.after} side={side} />;
}

function EmptyRow({ tone }: { tone: "removed" | "added" }) {
  const cls =
    tone === "removed"
      ? "bg-rose-50/40 dark:bg-rose-500/5"
      : "bg-emerald-50/40 dark:bg-emerald-500/5";
  return <div className={cn("px-3 py-0.5", cls)}>{" "}</div>;
}

function ModifiedCell({
  before,
  after,
  side,
}: {
  before: string;
  after: string;
  side: "before" | "after";
}) {
  // One diff, both sides render against it. `removed` segments live in `before`
  // only; `added` segments live in `after` only; everything else is shared.
  const parts: Change[] = diffWordsWithSpace(before, after);

  const bg =
    side === "before"
      ? "bg-rose-50/70 dark:bg-rose-500/10"
      : "bg-emerald-50/70 dark:bg-emerald-500/10";
  const hot =
    side === "before"
      ? "bg-rose-200/80 text-rose-900 dark:bg-rose-500/30 dark:text-rose-100"
      : "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-500/30 dark:text-emerald-100";

  return (
    <div className={cn("whitespace-pre-wrap break-words px-3 py-0.5", bg)}>
      {parts.map((p, i) => {
        // before column drops `added` (they live only in the after side);
        // after column drops `removed` (they live only in the before side).
        if (side === "before" && p.added) return null;
        if (side === "after" && p.removed) return null;
        const isHot = p.added || p.removed;
        return (
          <span key={i} className={isHot ? hot : undefined}>
            {p.value}
          </span>
        );
      })}
    </div>
  );
}

function buildRows(before: string, after: string): Row[] {
  if (before === after) {
    return splitLines(before).map((line) => ({
      kind: "unchanged" as const,
      before: line,
      after: line,
    }));
  }

  const parts = diffLines(before, after);
  const rows: Row[] = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const lines = splitLines(p.value);

    if (!p.added && !p.removed) {
      for (const line of lines) {
        rows.push({ kind: "unchanged", before: line, after: line });
      }
      continue;
    }

    if (p.removed) {
      const next = parts[i + 1];
      if (next?.added) {
        // Pair removed/added line-by-line into "modified" rows; the extras hang
        // off the end as pure removed or added rows.
        const nextLines = splitLines(next.value);
        const len = Math.max(lines.length, nextLines.length);
        for (let j = 0; j < len; j++) {
          const b = lines[j];
          const a = nextLines[j];
          if (b !== undefined && a !== undefined) {
            rows.push({ kind: "modified", before: b, after: a });
          } else if (b !== undefined) {
            rows.push({ kind: "removed", before: b });
          } else if (a !== undefined) {
            rows.push({ kind: "added", after: a });
          }
        }
        i++; // consume the added part
      } else {
        for (const line of lines) rows.push({ kind: "removed", before: line });
      }
      continue;
    }

    // p.added without a preceding p.removed
    for (const line of lines) rows.push({ kind: "added", after: line });
  }

  return rows;
}

function splitLines(value: string): string[] {
  // Preserve every line, including blanks, but drop the trailing empty caused
  // by a final newline in the source string.
  const lines = value.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}
