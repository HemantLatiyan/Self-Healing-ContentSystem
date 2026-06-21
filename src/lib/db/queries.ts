import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ChangeSetRow,
  ChangeSeverity,
  ContentType,
  PatchProposalRow,
  ProposalStatus,
  SourceRow,
} from "@/lib/db/types";

export async function listSources(): Promise<SourceRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("sources")
    .select("*")
    .order("id");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SourceRow[];
}

export interface RecentChangeSet extends ChangeSetRow {
  source_name: string;
  proposal_counts: Partial<Record<ProposalStatus, number>>;
}

export async function listRecentChangeSets(limit = 20): Promise<RecentChangeSet[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("change_sets")
    .select("*, sources(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  type Row = ChangeSetRow & { sources: { name: string } | null };
  const rows = (data ?? []) as unknown as Row[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const { data: props, error: pErr } = await db
    .from("patch_proposals")
    .select("changeset_id, status")
    .in("changeset_id", ids);
  if (pErr) throw new Error(pErr.message);

  type PropRow = { changeset_id: number; status: ProposalStatus };
  const counts = new Map<number, Partial<Record<ProposalStatus, number>>>();
  for (const p of (props ?? []) as unknown as PropRow[]) {
    const m = counts.get(p.changeset_id) ?? {};
    m[p.status] = (m[p.status] ?? 0) + 1;
    counts.set(p.changeset_id, m);
  }

  return rows.map((r) => ({
    ...r,
    source_name: r.sources?.name ?? "(unknown)",
    proposal_counts: counts.get(r.id) ?? {},
  }));
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  patch_proposal_id: number | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export async function listRecentAudit(limit = 20): Promise<AuditEntry[]> {
  const { data, error } = await supabaseAdmin()
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AuditEntry[];
}

export interface PendingProposalListItem {
  id: number;
  content_id: number;
  content_title: string;
  content_type: ContentType;
  source_name: string;
  severity: ChangeSeverity | null;
  confidence_score: number;
  created_at: string;
}

export async function listPendingProposals(): Promise<PendingProposalListItem[]> {
  const { data, error } = await supabaseAdmin()
    .from("patch_proposals")
    .select(
      "id, confidence_score, created_at, content_id, content:content(title, type), change_set:change_sets(severity, source:sources(name))",
    )
    .eq("status", "pending")
    .order("confidence_score", { ascending: true });
  if (error) throw new Error(error.message);

  type Row = {
    id: number;
    content_id: number;
    confidence_score: number;
    created_at: string;
    content: { title: string; type: ContentType } | null;
    change_set: {
      severity: ChangeSeverity | null;
      source: { name: string } | null;
    } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    content_id: r.content_id,
    content_title: r.content?.title ?? "(unknown)",
    content_type: r.content?.type ?? "lesson",
    source_name: r.change_set?.source?.name ?? "(unknown)",
    severity: r.change_set?.severity ?? null,
    confidence_score: r.confidence_score,
    created_at: r.created_at,
  }));
}

export interface ProposalDetail {
  proposal: PatchProposalRow;
  content_title: string;
  content_type: ContentType;
  source_name: string;
  source_location: string;
  source_diff: { prev_text: string; new_text: string };
  change_set: {
    id: number;
    severity: ChangeSeverity | null;
    semantic_summary: string | null;
    changed_concepts: string[] | null;
    created_at: string;
  };
}

export async function getProposalDetail(
  proposal_id: number,
): Promise<ProposalDetail | null> {
  const db = supabaseAdmin();

  const { data: proposalRow, error: pErr } = await db
    .from("patch_proposals")
    .select(
      "*, content:content(title, type), change_set:change_sets(id, severity, semantic_summary, changed_concepts, created_at, prev_snapshot_id, new_snapshot_id, source:sources(name, location))",
    )
    .eq("id", proposal_id)
    .single();
  if (pErr || !proposalRow) return null;

  type Row = PatchProposalRow & {
    content: { title: string; type: ContentType } | null;
    change_set: {
      id: number;
      severity: ChangeSeverity | null;
      semantic_summary: string | null;
      changed_concepts: string[] | null;
      created_at: string;
      prev_snapshot_id: number | null;
      new_snapshot_id: number;
      source: { name: string; location: string } | null;
    } | null;
  };
  const row = proposalRow as unknown as Row;
  if (!row.change_set) return null;

  const snapshotIds = [row.change_set.prev_snapshot_id, row.change_set.new_snapshot_id].filter(
    (id): id is number => id !== null,
  );
  const { data: snapshotsRaw, error: sErr } = await db
    .from("snapshots")
    .select("id, normalized_content")
    .in("id", snapshotIds);
  if (sErr) throw new Error(`snapshots lookup failed: ${sErr.message}`);

  type Snap = { id: number; normalized_content: string };
  const byId = new Map<number, string>();
  for (const s of (snapshotsRaw ?? []) as unknown as Snap[]) {
    byId.set(s.id, s.normalized_content);
  }

  const { content, change_set: cs, ...rest } = row;
  const proposal: PatchProposalRow = rest as PatchProposalRow;

  return {
    proposal,
    content_title: content?.title ?? "(unknown)",
    content_type: content?.type ?? "lesson",
    source_name: cs.source?.name ?? "(unknown)",
    source_location: cs.source?.location ?? "",
    source_diff: {
      prev_text: cs.prev_snapshot_id ? byId.get(cs.prev_snapshot_id) ?? "" : "",
      new_text: byId.get(cs.new_snapshot_id) ?? "",
    },
    change_set: {
      id: cs.id,
      severity: cs.severity,
      semantic_summary: cs.semantic_summary,
      changed_concepts: cs.changed_concepts,
      created_at: cs.created_at,
    },
  };
}
