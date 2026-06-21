import { diffWordsWithSpace, diffLines, type Change } from "diff";
import { cn } from "@/lib/utils";

interface DiffViewProps {
  before: string;
  after: string;
  /** "words" for prose; "lines" for big bodies of text where line-level reads better. */
  mode?: "words" | "lines";
  className?: string;
}

/**
 * Inline unified diff. Removed text is struck through in rose; added text is
 * highlighted in emerald. Unchanged text reads as normal prose.
 *
 * This isn't side-by-side because, for short prose patches (the common case
 * here — flashcards, quizzes, single rationale paragraphs), inline reads more
 * fluently and uses less horizontal space.
 */
export function DiffView({ before, after, mode = "words", className }: DiffViewProps) {
  const parts: Change[] =
    mode === "lines"
      ? diffLines(before, after)
      : diffWordsWithSpace(before, after);

  return (
    <pre
      className={cn(
        "whitespace-pre-wrap break-words rounded-md border bg-card p-4 font-sans text-sm leading-relaxed",
        className,
      )}
    >
      {parts.map((p, i) => {
        if (p.added) {
          return (
            <span
              key={i}
              className="rounded-sm bg-emerald-100/70 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200"
            >
              {p.value}
            </span>
          );
        }
        if (p.removed) {
          return (
            <span
              key={i}
              className="rounded-sm bg-rose-100/70 text-rose-900/70 line-through decoration-rose-500/60 dark:bg-rose-500/15 dark:text-rose-200/70"
            >
              {p.value}
            </span>
          );
        }
        return (
          <span key={i} className="text-muted-foreground">
            {p.value}
          </span>
        );
      })}
    </pre>
  );
}
