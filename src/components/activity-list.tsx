"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AuditEntry, RecentChangeSet } from "@/lib/db/queries";
import type { ChangeSeverity } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export type ActivityItem =
  | { kind: "change_set"; at: string; data: RecentChangeSet }
  | { kind: "audit"; at: string; data: AuditEntry };

interface Props {
  items: ActivityItem[];
  initialLimit?: number;
}

export function ActivityList({ items, initialLimit = 4 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = items.length > initialLimit;
  const visible = expanded || !hasOverflow ? items : items.slice(0, initialLimit);
  const hiddenCount = items.length - initialLimit;

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
        Nothing yet. Click <strong>Scan now</strong> to start the pipeline.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2 text-sm">
        {visible.map((item, i) => (
          <ActivityRow key={`${item.kind}-${item.at}-${i}`} item={item} />
        ))}
      </ul>
      {hasOverflow && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              View {hiddenCount} more
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  if (item.kind === "change_set") {
    const c = item.data;
    return (
      <li className="flex items-baseline justify-between gap-3 rounded border bg-card px-3 py-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">cs#{c.id}</span>
            <span className="truncate text-xs font-medium">{c.source_name}</span>
            <StatusPill text={c.status} />
            {c.severity && <SeverityWord severity={c.severity} />}
          </div>
          {c.semantic_summary && (
            <p className="line-clamp-2 text-[11px] text-muted-foreground">
              {c.semantic_summary}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
        </span>
      </li>
    );
  }

  const a = item.data;
  const link = a.patch_proposal_id ? `/proposals/${a.patch_proposal_id}` : null;
  const body = (
    <div className="flex items-center gap-2">
      <ActorPill actor={a.actor} />
      <span className="text-xs font-medium">{a.action.replace(/_/g, " ")}</span>
      {a.payload?.content_title ? (
        <span className="truncate text-[11px] text-muted-foreground">
          {String(a.payload.content_title)}
        </span>
      ) : null}
    </div>
  );
  return (
    <li>
      {link ? (
        <Link
          href={link}
          className="flex items-baseline justify-between gap-3 rounded border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">{body}</div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
          </span>
        </Link>
      ) : (
        <div className="flex items-baseline justify-between gap-3 rounded border bg-card px-3 py-2">
          <div className="min-w-0 flex-1">{body}</div>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
          </span>
        </div>
      )}
    </li>
  );
}

function StatusPill({ text }: { text: string }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {text}
    </span>
  );
}

function ActorPill({ actor }: { actor: string }) {
  const isSystem = actor.startsWith("system");
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase",
        isSystem
          ? "border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
          : "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
      )}
    >
      {actor}
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
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider",
        SEVERITY_TONE[severity],
      )}
    >
      {severity}
    </span>
  );
}
