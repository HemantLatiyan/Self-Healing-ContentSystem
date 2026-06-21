import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import type { ChangeSetRow, PatchProposalRow } from "@/lib/db/types";

export interface GateResult {
  change_set_id: number;
  auto_published_ids: number[];
  left_pending_ids: number[];
  threshold: number;
}

export interface GateOptions {
  thresholdOverride?: number;
}

/**
 * Auto-heal gate: for every pending proposal on this change_set,
 *   - if confidence >= AUTO_HEAL_THRESHOLD: write content_versions row, advance
 *     content.current_*, mark proposal auto_published, audit it.
 *   - else: leave it pending for the reviewer queue.
 * Finally: change_sets.status = 'done'.
 *
 * Idempotent: a proposal already marked auto_published is skipped, and
 * content.current_version only advances when a new version row is inserted.
 */
export async function runGateStep({
  change_set,
  thresholdOverride,
}: {
  change_set: ChangeSetRow;
  thresholdOverride?: number;
}): Promise<GateResult> {
  const db = supabaseAdmin();
  const threshold = thresholdOverride ?? env.AUTO_HEAL_THRESHOLD();

  const { data: proposals, error } = await db
    .from("patch_proposals")
    .select("*")
    .eq("changeset_id", change_set.id)
    .eq("status", "pending");
  if (error) throw new Error(`Loading proposals failed: ${error.message}`);

  const auto_published_ids: number[] = [];
  const left_pending_ids: number[] = [];

  for (const p of (proposals ?? []) as unknown as PatchProposalRow[]) {
    if (p.confidence_score >= threshold) {
      await autoPublish(p, change_set.id);
      auto_published_ids.push(p.id);
    } else {
      left_pending_ids.push(p.id);
    }
  }

  await db
    .from("change_sets")
    .update({ status: "done" })
    .eq("id", change_set.id);

  return {
    change_set_id: change_set.id,
    auto_published_ids,
    left_pending_ids,
    threshold,
  };
}

async function autoPublish(proposal: PatchProposalRow, change_set_id: number) {
  const db = supabaseAdmin();

  const { data: content, error: cErr } = await db
    .from("content")
    .select("current_version, title")
    .eq("id", proposal.content_id)
    .single();
  if (cErr || !content) {
    throw new Error(
      `auto_publish: content ${proposal.content_id} missing: ${cErr?.message}`,
    );
  }
  const newVersion = (content.current_version as number) + 1;
  const now = new Date().toISOString();

  const { error: vErr } = await db.from("content_versions").insert({
    content_id: proposal.content_id,
    body: proposal.proposed_body,
    version: newVersion,
    source_changeset_id: change_set_id,
    published_by: "system",
  });
  if (vErr) throw new Error(`content_versions insert failed: ${vErr.message}`);

  const { error: uErr } = await db
    .from("content")
    .update({
      current_body: proposal.proposed_body,
      current_version: newVersion,
      updated_at: now,
    })
    .eq("id", proposal.content_id);
  if (uErr) throw new Error(`content update failed: ${uErr.message}`);

  const { error: pErr } = await db
    .from("patch_proposals")
    .update({
      status: "auto_published",
      reviewer_id: "system",
      reviewed_at: now,
    })
    .eq("id", proposal.id);
  if (pErr) throw new Error(`patch_proposals update failed: ${pErr.message}`);

  await db.from("audit_log").insert({
    actor: "system",
    action: "auto_publish",
    patch_proposal_id: proposal.id,
    payload: {
      content_id: proposal.content_id,
      content_title: content.title,
      change_set_id,
      confidence_score: proposal.confidence_score,
      new_version: newVersion,
    },
  });
}
