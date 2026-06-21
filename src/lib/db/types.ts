// Minimal row types matching supabase/migrations/0001_init.sql.
// Hand-written for the MVP — swap to `supabase gen types` if/when this grows.

export type SourceType = "markdown" | "html";
export type ContentType = "lesson" | "quiz" | "rationale" | "flashcard";
export type ChangesetStatus =
  | "detected"
  | "diffed"
  | "impacted"
  | "proposed"
  | "done"
  | "failed";
export type ChangeSeverity = "trivial" | "minor" | "major";
export type ProposalStatus =
  | "pending"
  | "auto_published"
  | "approved"
  | "rejected"
  | "superseded";

export interface SourceRow {
  id: number;
  name: string;
  type: SourceType;
  location: string;
  latest_hash: string | null;
  latest_snapshot_id: number | null;
  updated_at: string;
}

export interface SnapshotRow {
  id: number;
  source_id: number;
  raw_content: string;
  normalized_content: string;
  hash: string;
  created_at: string;
}

export interface ChangeSetRow {
  id: number;
  source_id: number;
  prev_snapshot_id: number | null;
  new_snapshot_id: number;
  status: ChangesetStatus;
  severity: ChangeSeverity | null;
  semantic_summary: string | null;
  failure_reason: string | null;
  changed_concepts: string[] | null;
  created_at: string;
}

export interface ContentRow {
  id: number;
  type: ContentType;
  title: string;
  current_body: string;
  current_version: number;
  primary_concept_id: number | null;
  updated_at: string;
}

export interface ConfidenceBreakdown {
  model_self_score: number;
  patch_size_ratio: number;
  severity_factor: number;
  citation_overlap: number;
  cited_concepts: string[];
  matched_concepts: string[];
  reasoning: string;
}

export interface PatchProposalRow {
  id: number;
  changeset_id: number;
  content_id: number;
  old_body: string;
  proposed_body: string;
  confidence_score: number;
  confidence_breakdown: ConfidenceBreakdown;
  status: ProposalStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}
