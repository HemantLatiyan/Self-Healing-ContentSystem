import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PatchProposalRow } from "@/lib/db/types";

export type ReviewDecision =
  | { kind: "approve"; notes?: string }
  | { kind: "edit_and_approve"; edited_body: string; notes?: string }
  | { kind: "reject"; notes?: string };

export interface ReviewResult {
  proposal_id: number;
  status: "approved" | "rejected";
  new_version?: number;
}

const DEFAULT_REVIEWER = "reviewer";

/**
 * Apply a reviewer's decision to a pending patch proposal.
 *
 * - approve / edit_and_approve: insert content_versions, advance content.current_*,
 *   mark proposal approved, audit_log with action='approve' (or 'edit_and_approve').
 * - reject: mark proposal rejected, audit_log with action='reject'. Content untouched.
 *
 * Reviewer is the MVP-hardcoded actor; replace with session-derived identity
 * once auth lands.
 */
export async function applyReviewDecision(
  proposal_id: number,
  decision: ReviewDecision,
  reviewer_id: string = DEFAULT_REVIEWER,
): Promise<ReviewResult> {
  const db = supabaseAdmin();
  const { data: proposalRaw, error: pErr } = await db
    .from("patch_proposals")
    .select("*")
    .eq("id", proposal_id)
    .single();
  if (pErr || !proposalRaw) {
    throw new Error(`Proposal ${proposal_id} not found: ${pErr?.message ?? ""}`);
  }
  const proposal = proposalRaw as unknown as PatchProposalRow;

  if (proposal.status !== "pending") {
    throw new Error(
      `Proposal ${proposal_id} is already ${proposal.status}; only pending proposals can be reviewed.`,
    );
  }

  const now = new Date().toISOString();

  if (decision.kind === "reject") {
    await db
      .from("patch_proposals")
      .update({
        status: "rejected",
        reviewer_id,
        reviewed_at: now,
        review_notes: decision.notes ?? null,
      })
      .eq("id", proposal_id);

    await db.from("audit_log").insert({
      actor: reviewer_id,
      action: "reject",
      patch_proposal_id: proposal_id,
      payload: {
        content_id: proposal.content_id,
        change_set_id: proposal.changeset_id,
        notes: decision.notes ?? null,
      },
    });

    return { proposal_id, status: "rejected" };
  }

  const publishedBody =
    decision.kind === "edit_and_approve"
      ? decision.edited_body
      : proposal.proposed_body;

  const { data: content, error: cErr } = await db
    .from("content")
    .select("current_version, title")
    .eq("id", proposal.content_id)
    .single();
  if (cErr || !content) {
    throw new Error(
      `Content ${proposal.content_id} missing: ${cErr?.message ?? ""}`,
    );
  }
  const new_version = (content.current_version as number) + 1;

  const { error: vErr } = await db.from("content_versions").insert({
    content_id: proposal.content_id,
    body: publishedBody,
    version: new_version,
    source_changeset_id: proposal.changeset_id,
    published_by: reviewer_id,
  });
  if (vErr) throw new Error(`content_versions insert failed: ${vErr.message}`);

  const { error: uErr } = await db
    .from("content")
    .update({
      current_body: publishedBody,
      current_version: new_version,
      updated_at: now,
    })
    .eq("id", proposal.content_id);
  if (uErr) throw new Error(`content update failed: ${uErr.message}`);

  await db
    .from("patch_proposals")
    .update({
      status: "approved",
      reviewer_id,
      reviewed_at: now,
      review_notes: decision.notes ?? null,
    })
    .eq("id", proposal_id);

  await db.from("audit_log").insert({
    actor: reviewer_id,
    action: decision.kind === "edit_and_approve" ? "edit_and_approve" : "approve",
    patch_proposal_id: proposal_id,
    payload: {
      content_id: proposal.content_id,
      content_title: content.title,
      change_set_id: proposal.changeset_id,
      new_version,
      notes: decision.notes ?? null,
      edited: decision.kind === "edit_and_approve",
    },
  });

  return { proposal_id, status: "approved", new_version };
}
