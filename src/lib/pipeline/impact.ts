import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ChangeSetRow } from "@/lib/db/types";

export interface ImpactResult {
  change_set_id: number;
  impacted_content_ids: number[];
  scoped_by_changed_concepts: boolean;
}

/**
 * Resolves the set of content items affected by a change_set and persists
 * them to change_set_impacts.
 *
 * Narrowing rule:
 *   - If change_set.changed_concepts is non-null and non-empty, the impact
 *     set is content tied to ANY of those concepts (intersected with the
 *     source's concepts so the LLM can't expand scope by hallucinating).
 *   - Otherwise (defensive fallback), the impact set is all content tied
 *     to any concept linked to the source.
 *
 * Step C only generates patches for content_ids written here.
 */
export async function runImpactStep({
  change_set,
}: {
  change_set: ChangeSetRow;
}): Promise<ImpactResult> {
  const db = supabaseAdmin();

  // Source's full concept set (anchor for both branches).
  const { data: srcConcepts, error: scErr } = await db
    .from("source_concepts")
    .select("concept_id, concepts(name)")
    .eq("source_id", change_set.source_id);
  if (scErr) throw new Error(`source_concepts lookup failed: ${scErr.message}`);

  type ConceptJoin = { concept_id: number; concepts: { name: string } | null };
  const sourceConcepts = (srcConcepts ?? []) as unknown as ConceptJoin[];
  const sourceConceptIds = sourceConcepts.map((r) => r.concept_id);

  const wanted = change_set.changed_concepts ?? [];
  const scoped = wanted.length > 0;
  const targetIds = scoped
    ? sourceConcepts
        .filter((r) => r.concepts && wanted.includes(r.concepts.name))
        .map((r) => r.concept_id)
    : sourceConceptIds;

  let impactedIds: number[] = [];

  if (targetIds.length > 0) {
    const { data: cc, error: ccErr } = await db
      .from("content_concepts")
      .select("content_id")
      .in("concept_id", targetIds);
    if (ccErr) throw new Error(`content_concepts lookup failed: ${ccErr.message}`);
    impactedIds = Array.from(
      new Set((cc ?? []).map((r) => r.content_id as number)),
    );
  }

  if (impactedIds.length > 0) {
    const rows = impactedIds.map((content_id) => ({
      change_set_id: change_set.id,
      content_id,
    }));
    // Idempotency: ignore conflicts if a previous run partially completed.
    const { error: insErr } = await db
      .from("change_set_impacts")
      .upsert(rows, { onConflict: "change_set_id,content_id" });
    if (insErr)
      throw new Error(`change_set_impacts insert failed: ${insErr.message}`);
  }

  await db
    .from("change_sets")
    .update({ status: "impacted" })
    .eq("id", change_set.id);

  return {
    change_set_id: change_set.id,
    impacted_content_ids: impactedIds.sort((a, b) => a - b),
    scoped_by_changed_concepts: scoped,
  };
}
