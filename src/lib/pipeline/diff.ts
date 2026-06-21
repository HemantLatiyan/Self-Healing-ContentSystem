import "server-only";
import { generateObject } from "ai";
import { geminiModel } from "@/lib/ai/gemini";
import { SemanticDiffSchema, type SemanticDiff } from "@/lib/ai/schemas";
import { supabaseAdmin } from "@/lib/supabase/admin";

interface DiffInputs {
  change_set_id: number;
  source_name: string;
  prev_normalized: string;
  new_normalized: string;
  concept_names: string[];
}

export async function semanticDiff(inputs: DiffInputs): Promise<SemanticDiff> {
  const { source_name, prev_normalized, new_normalized, concept_names } = inputs;

  const conceptList = concept_names.map((n) => `- ${n}`).join("\n");

  const { object } = await generateObject({
    model: geminiModel(),
    schema: SemanticDiffSchema,
    system:
      "You are classifying the educational impact of a source-document change. " +
      "Be strict: 'trivial' means no learner-facing fact changed; 'major' means a learner " +
      "studying this source would need to revise their mental model. Numeric corrections " +
      "(percentages, counts) are usually 'minor' unless the new number invalidates a learned rule.",
    prompt:
      `Source: ${source_name}\n\n` +
      `Known concepts (use exact names; pick from this list only):\n${conceptList}\n\n` +
      `=== PREVIOUS VERSION ===\n${prev_normalized}\n\n` +
      `=== NEW VERSION ===\n${new_normalized}\n\n` +
      `Return: severity, summary, and changed_concepts.`,
  });

  return object;
}

interface DiffStepDeps {
  change_set: {
    id: number;
    source_id: number;
    prev_snapshot_id: number | null;
    new_snapshot_id: number;
  };
}

// Runs the detected→diffed transition for one change_set.
// Idempotent: writes severity+summary+status under the assumption the caller
// has gated on status='detected'.
export async function runDiffStep({ change_set }: DiffStepDeps): Promise<{
  severity: SemanticDiff["severity"];
  changed_concepts: string[];
}> {
  const db = supabaseAdmin();

  if (change_set.prev_snapshot_id === null) {
    throw new Error(
      `change_set ${change_set.id} has no prev_snapshot — cannot diff (baseline rows should not produce change_sets).`,
    );
  }

  const [{ data: src }, { data: prev }, { data: next }, { data: concepts }] =
    await Promise.all([
      db
        .from("sources")
        .select("name")
        .eq("id", change_set.source_id)
        .single(),
      db
        .from("snapshots")
        .select("normalized_content")
        .eq("id", change_set.prev_snapshot_id)
        .single(),
      db
        .from("snapshots")
        .select("normalized_content")
        .eq("id", change_set.new_snapshot_id)
        .single(),
      db
        .from("source_concepts")
        .select("concept_id, concepts(name)")
        .eq("source_id", change_set.source_id),
    ]);

  if (!src || !prev || !next || !concepts) {
    throw new Error(
      `Missing rows for change_set ${change_set.id} diff inputs.`,
    );
  }

  type ConceptJoin = { concepts: { name: string } | null };
  const concept_names = (concepts as unknown as ConceptJoin[])
    .map((r) => r.concepts?.name)
    .filter((n): n is string => Boolean(n));

  const diff = await semanticDiff({
    change_set_id: change_set.id,
    source_name: src.name as string,
    prev_normalized: prev.normalized_content as string,
    new_normalized: next.normalized_content as string,
    concept_names,
  });

  await db
    .from("change_sets")
    .update({
      status: "diffed",
      severity: diff.severity,
      semantic_summary: diff.summary,
      changed_concepts: diff.changed_concepts,
    })
    .eq("id", change_set.id);

  return { severity: diff.severity, changed_concepts: diff.changed_concepts };
}
