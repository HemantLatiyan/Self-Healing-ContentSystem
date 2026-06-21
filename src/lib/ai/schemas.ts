import { z } from "zod";

// LLM-returned semantic diff between two snapshots of a single source.
export const SemanticDiffSchema = z.object({
  severity: z
    .enum(["trivial", "minor", "major"])
    .describe(
      "trivial = typo/wording/numbers-of-no-pedagogical-consequence; " +
        "minor = small factual updates; " +
        "major = restructure, deprecation, or content that changes what learners should know.",
    ),
  summary: z
    .string()
    .min(1)
    .describe(
      "One short paragraph (<=120 words) describing what changed and the pedagogical consequence.",
    ),
  changed_concepts: z
    .array(z.string())
    .describe(
      "Names of concepts (from the provided concept list ONLY) whose meaning or content was altered. " +
        "Use exactly the names provided — do not invent new ones. Empty array if no listed concept is affected.",
    ),
});

export type SemanticDiff = z.infer<typeof SemanticDiffSchema>;

// LLM-returned patch for one content item.
export const PatchProposalLLMSchema = z.object({
  proposed_body: z
    .string()
    .min(1)
    .describe(
      "The full updated body of the content item, preserving its existing format (markdown, " +
        "flashcard Q/A structure, quiz options, etc.). Update only what the source change requires.",
    ),
  model_self_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "Your own confidence (0-1) that this patch is correct and complete given the source diff.",
    ),
  cited_concepts: z
    .array(z.string())
    .describe(
      "Names of concepts (from the provided concept list ONLY) that the patched content relies on.",
    ),
  reasoning: z
    .string()
    .describe("One short sentence: why the patch is what it is."),
});

export type PatchProposalLLM = z.infer<typeof PatchProposalLLMSchema>;
