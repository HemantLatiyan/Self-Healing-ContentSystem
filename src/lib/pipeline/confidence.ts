import { diffWordsWithSpace } from "diff";
import type { ChangeSeverity, ConfidenceBreakdown } from "@/lib/db/types";

const WEIGHTS = {
  model_self_score: 0.30,
  patch_size: 0.25,
  severity: 0.25,
  citation_overlap: 0.20,
} as const;

const SEVERITY_FACTOR: Record<ChangeSeverity, number> = {
  trivial: 1.0,
  minor: 0.7,
  major: 0.3,
};

/** Fraction of the rewritten content vs. the unchanged tail. 0 = identical, 1 = total rewrite. */
function patchSizeRatio(oldBody: string, newBody: string): number {
  if (oldBody === newBody) return 0;
  const parts = diffWordsWithSpace(oldBody, newBody);
  let changed = 0;
  let total = 0;
  for (const p of parts) {
    total += p.value.length;
    if (p.added || p.removed) changed += p.value.length;
  }
  return total === 0 ? 0 : Math.min(1, changed / total);
}

/**
 * Fraction of LLM-cited concept names that are actually attached to this source.
 * Penalizes the LLM for inventing concept names ("hallucinated citations").
 * Cleaner than substring-matching the snapshot text, since concept names are
 * snake_case slugs (`t2a_family`) that won't appear verbatim in prose.
 */
function citationOverlap(
  cited: string[],
  sourceConceptNames: string[],
): { overlap: number; matched: string[] } {
  if (cited.length === 0) return { overlap: 0.5, matched: [] };
  const known = new Set(sourceConceptNames.map((s) => s.toLowerCase()));
  const matched = cited.filter((c) => known.has(c.toLowerCase()));
  return { overlap: matched.length / cited.length, matched };
}

export interface ComputeConfidenceInput {
  modelSelfScore: number;
  severity: ChangeSeverity;
  oldBody: string;
  newBody: string;
  citedConcepts: string[];
  sourceConceptNames: string[];
  reasoning: string;
}

export interface ComputeConfidenceOutput {
  score: number;
  breakdown: ConfidenceBreakdown;
}

export function computeConfidence(
  input: ComputeConfidenceInput,
): ComputeConfidenceOutput {
  const sizeRatio = patchSizeRatio(input.oldBody, input.newBody);
  const sizeComponent = 1 - sizeRatio;
  const sev = SEVERITY_FACTOR[input.severity];
  const { overlap, matched } = citationOverlap(
    input.citedConcepts,
    input.sourceConceptNames,
  );

  const score =
    WEIGHTS.model_self_score * input.modelSelfScore +
    WEIGHTS.patch_size * sizeComponent +
    WEIGHTS.severity * sev +
    WEIGHTS.citation_overlap * overlap;

  return {
    score: clamp(score),
    breakdown: {
      model_self_score: round(input.modelSelfScore),
      patch_size_ratio: round(sizeRatio),
      severity_factor: sev,
      citation_overlap: round(overlap),
      cited_concepts: input.citedConcepts,
      matched_concepts: matched,
      reasoning: input.reasoning,
    },
  };
}

function clamp(n: number): number {
  return Math.min(1, Math.max(0, round(n)));
}
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
