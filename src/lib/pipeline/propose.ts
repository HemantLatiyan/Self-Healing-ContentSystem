import "server-only";
import { generateObject } from "ai";
import { geminiModel } from "@/lib/ai/gemini";
import { PatchProposalLLMSchema } from "@/lib/ai/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  ChangeSetRow,
  ContentRow,
  ChangeSeverity,
} from "@/lib/db/types";
import { computeConfidence } from "./confidence";

interface ProposalContext {
  source_name: string;
  severity: ChangeSeverity;
  semantic_summary: string;
  changed_concepts: string[];
  new_normalized: string;
  source_concept_names: string[];
}

async function loadContext(change_set: ChangeSetRow): Promise<ProposalContext> {
  const db = supabaseAdmin();
  const [{ data: src }, { data: snap }, { data: srcConcepts }] = await Promise.all([
    db.from("sources").select("name").eq("id", change_set.source_id).single(),
    db
      .from("snapshots")
      .select("normalized_content")
      .eq("id", change_set.new_snapshot_id)
      .single(),
    db
      .from("source_concepts")
      .select("concepts(name)")
      .eq("source_id", change_set.source_id),
  ]);
  if (!src || !snap || !srcConcepts) {
    throw new Error(
      `Could not load proposal context for change_set ${change_set.id}.`,
    );
  }
  type ConceptJoin = { concepts: { name: string } | null };
  const source_concept_names = (srcConcepts as unknown as ConceptJoin[])
    .map((r) => r.concepts?.name)
    .filter((n): n is string => Boolean(n));

  return {
    source_name: src.name as string,
    severity: change_set.severity ?? "minor",
    semantic_summary: change_set.semantic_summary ?? "",
    changed_concepts: change_set.changed_concepts ?? [],
    new_normalized: snap.normalized_content as string,
    source_concept_names,
  };
}

async function loadImpactedContent(
  change_set_id: number,
): Promise<ContentRow[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("change_set_impacts")
    .select("content(*)")
    .eq("change_set_id", change_set_id);
  if (error) throw new Error(`Loading impacted content failed: ${error.message}`);
  type Row = { content: ContentRow | null };
  return ((data ?? []) as unknown as Row[])
    .map((r) => r.content)
    .filter((c): c is ContentRow => Boolean(c));
}

async function generateOnePatch(
  content: ContentRow,
  ctx: ProposalContext,
) {
  const conceptList = ctx.source_concept_names.map((n) => `- ${n}`).join("\n");
  const changedConceptsLine =
    ctx.changed_concepts.length > 0
      ? `Concepts altered by this change: ${ctx.changed_concepts.join(", ")}`
      : "Concepts altered by this change: (none flagged — treat as wording-only adjustment)";

  const { object } = await generateObject({
    model: geminiModel(),
    schema: PatchProposalLLMSchema,
    system: [
      "You are patching an educational content item to reflect a source change.",
      "Preserve the item's FORMAT: quizzes keep option labels and the **Answer:** line; flashcards keep the **Q:** / **A:** structure; rationales keep paragraph shape; lessons keep their section headings.",
      "Rewrite the CONTENT as much as the source change demands — minimal edits are not a virtue when the source has materially changed.",
      "If a concept this content is built on has been retired, removed, deprecated, or replaced in the new source, the patched body MUST say so plainly in its opening — never preserve framing the new source has invalidated. A rationale for a retired item must lead with the retirement; a flashcard whose answer is no longer correct must be rewritten so the answer matches the new source; a quiz option that is no longer valid must be removed or replaced.",
      "Cite only concept names from the provided list; do not invent new ones.",
    ].join(" "),
    prompt:
      `Source: ${ctx.source_name}\n` +
      `Severity of source change: ${ctx.severity}\n` +
      `${changedConceptsLine}\n` +
      `Diff summary: ${ctx.semantic_summary}\n\n` +
      `Concepts on this source (use exact names when citing; pick from this list only):\n` +
      `${conceptList}\n\n` +
      `=== NEW SOURCE CONTENT ===\n${ctx.new_normalized}\n\n` +
      `=== CONTENT ITEM TO PATCH (${content.type}, title: "${content.title}") ===\n` +
      `${content.current_body}\n\n` +
      `Return: proposed_body, model_self_score, cited_concepts, reasoning.`,
  });
  return object;
}

export interface ProposalsResult {
  change_set_id: number;
  inserted_proposal_ids: number[];
  superseded_count: number;
}

/**
 * For each impacted content item: call the LLM, compute composite confidence,
 * supersede any prior pending proposal on that content, and insert a fresh one.
 * Advances change_sets.status to 'proposed'.
 */
export async function runProposalStep({
  change_set,
}: {
  change_set: ChangeSetRow;
}): Promise<ProposalsResult> {
  const db = supabaseAdmin();
  const ctx = await loadContext(change_set);
  const items = await loadImpactedContent(change_set.id);

  const inserted_proposal_ids: number[] = [];
  let superseded_count = 0;

  for (const content of items) {
    const llm = await generateOnePatch(content, ctx);

    const { score, breakdown } = computeConfidence({
      modelSelfScore: llm.model_self_score,
      severity: ctx.severity,
      oldBody: content.current_body,
      newBody: llm.proposed_body,
      citedConcepts: llm.cited_concepts,
      sourceConceptNames: ctx.source_concept_names,
      reasoning: llm.reasoning,
    });

    // Supersede any prior pending proposals on this content_id.
    const { data: superseded } = await db
      .from("patch_proposals")
      .update({
        status: "superseded",
        reviewed_at: new Date().toISOString(),
        review_notes: `Superseded by change_set ${change_set.id}`,
      })
      .eq("content_id", content.id)
      .eq("status", "pending")
      .select("id");
    superseded_count += superseded?.length ?? 0;

    const { data: proposal, error: insErr } = await db
      .from("patch_proposals")
      .insert({
        changeset_id: change_set.id,
        content_id: content.id,
        old_body: content.current_body,
        proposed_body: llm.proposed_body,
        confidence_score: score,
        confidence_breakdown: breakdown,
        status: "pending",
      })
      .select("id")
      .single();

    if (insErr || !proposal) {
      throw new Error(
        `patch_proposal insert failed for content ${content.id}: ${insErr?.message ?? "no row"}`,
      );
    }
    inserted_proposal_ids.push(proposal.id as number);
  }

  await db
    .from("change_sets")
    .update({ status: "proposed" })
    .eq("id", change_set.id);

  return {
    change_set_id: change_set.id,
    inserted_proposal_ids,
    superseded_count,
  };
}
