import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { listRecentAudit, listRecentChangeSets } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const [changeSets, audit] = await Promise.all([
    listRecentChangeSets(100),
    listRecentAudit(100),
  ]);

  type Item =
    | {
        kind: "change_set";
        at: string;
        id: number;
        source_name: string;
        status: string;
        severity: string | null;
        summary: string | null;
      }
    | {
        kind: "audit";
        at: string;
        id: number;
        actor: string;
        action: string;
        patch_proposal_id: number | null;
        content_title?: string;
        notes?: string;
        new_version?: number;
      };

  const items: Item[] = [
    ...changeSets.map<Item>((c) => ({
      kind: "change_set",
      at: c.created_at,
      id: c.id,
      source_name: c.source_name,
      status: c.status,
      severity: c.severity,
      summary: c.semantic_summary,
    })),
    ...audit.map<Item>((a) => ({
      kind: "audit",
      at: a.created_at,
      id: a.id,
      actor: a.actor,
      action: a.action,
      patch_proposal_id: a.patch_proposal_id,
      content_title: typeof a.payload?.content_title === "string" ? a.payload.content_title : undefined,
      notes: typeof a.payload?.notes === "string" ? a.payload.notes : undefined,
      new_version:
        typeof a.payload?.new_version === "number" ? a.payload.new_version : undefined,
    })),
  ].sort((a, b) => (a.at > b.at ? -1 : 1));

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-8">
      <header className="space-y-1 border-b pb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Every change set the pipeline detected and every publish or review decision since the seed
          was loaded. Newest first.
        </p>
      </header>

      <ol className="mt-6 space-y-2">
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
            No activity yet.
          </li>
        ) : (
          items.map((item) => <Row key={`${item.kind}-${item.id}`} item={item} />)
        )}
      </ol>
    </main>
  );
}

function Row({
  item,
}: {
  item:
    | {
        kind: "change_set";
        at: string;
        id: number;
        source_name: string;
        status: string;
        severity: string | null;
        summary: string | null;
      }
    | {
        kind: "audit";
        at: string;
        id: number;
        actor: string;
        action: string;
        patch_proposal_id: number | null;
        content_title?: string;
        notes?: string;
        new_version?: number;
      };
}) {
  if (item.kind === "change_set") {
    return (
      <li className="rounded-md border bg-card px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-muted-foreground">
                cs#{item.id}
              </span>
              <span className="text-sm font-medium">{item.source_name}</span>
              <Tag>{item.status}</Tag>
              {item.severity && <SeverityWord severity={item.severity} />}
            </div>
            {item.summary && (
              <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                {item.summary}
              </p>
            )}
          </div>
          <Time at={item.at} />
        </div>
      </li>
    );
  }

  const body = (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <ActorPill actor={item.actor} />
          <span className="text-sm font-medium">{item.action.replace(/_/g, " ")}</span>
          {item.content_title && (
            <span className="truncate text-xs text-muted-foreground">
              {item.content_title}
            </span>
          )}
          {item.new_version !== undefined && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              v{item.new_version}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="mt-1 italic text-xs text-muted-foreground">
            &ldquo;{item.notes}&rdquo;
          </p>
        )}
      </div>
      <Time at={item.at} />
    </div>
  );

  return (
    <li>
      {item.patch_proposal_id ? (
        <Link
          href={`/proposals/${item.patch_proposal_id}`}
          className="block rounded-md border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
        >
          {body}
        </Link>
      ) : (
        <div className="rounded-md border bg-card px-4 py-3">{body}</div>
      )}
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
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

const SEVERITY_TONE: Record<string, string> = {
  trivial: "text-emerald-700 dark:text-emerald-400",
  minor: "text-amber-700 dark:text-amber-400",
  major: "text-rose-700 dark:text-rose-400",
};

function SeverityWord({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium uppercase tracking-wider",
        SEVERITY_TONE[severity] ?? "text-muted-foreground",
      )}
    >
      {severity}
    </span>
  );
}

function Time({ at }: { at: string }) {
  return (
    <span className="shrink-0 text-[10px] text-muted-foreground">
      {formatDistanceToNow(new Date(at), { addSuffix: true })}
    </span>
  );
}
