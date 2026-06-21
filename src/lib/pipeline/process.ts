import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ChangeSetRow } from "@/lib/db/types";
import { runDiffStep } from "./diff";
import { runImpactStep } from "./impact";
import { runProposalStep } from "./propose";
import { runGateStep } from "./publish";

export interface Transition {
  change_set_id: number;
  from: ChangeSetRow["status"];
  to: ChangeSetRow["status"];
}

export interface ProcessFailure {
  change_set_id: number;
  at: ChangeSetRow["status"];
  error: string;
}

export interface ProcessReport {
  transitions: Transition[];
  failures: ProcessFailure[];
  started_at: string;
  finished_at: string;
}

export interface ProcessOptions {
  /** Override the auto-heal threshold for this tick — useful for dev/testing only. */
  thresholdOverride?: number;
}

/**
 * Drives the change_set state machine forward by one full pass per call.
 *
 *   detected  → diffed     (Phase 3A — semantic diff)
 *   diffed    → impacted   (Phase 3B — sql traversal)
 *   impacted  → proposed   (Phase 3C — patch generation)
 *   proposed  → done       (Phase 3D — auto-heal gate / leave pending)
 *
 * Failures park the change_set in status='failed' with a failure_reason.
 * Subsequent calls re-pick whatever status is current — so retries on
 * failed rows require manually flipping them back to their last good state.
 */
export async function runProcessTick(
  options: ProcessOptions = {},
): Promise<ProcessReport> {
  const started_at = new Date().toISOString();
  const transitions: Transition[] = [];
  const failures: ProcessFailure[] = [];

  await runStage("detected", async (cs) => {
    await runDiffStep({ change_set: cs });
    transitions.push({ change_set_id: cs.id, from: "detected", to: "diffed" });
  }, failures);

  await runStage("diffed", async (cs) => {
    await runImpactStep({ change_set: cs });
    transitions.push({ change_set_id: cs.id, from: "diffed", to: "impacted" });
  }, failures);

  await runStage("impacted", async (cs) => {
    await runProposalStep({ change_set: cs });
    transitions.push({ change_set_id: cs.id, from: "impacted", to: "proposed" });
  }, failures);

  await runStage("proposed", async (cs) => {
    await runGateStep({ change_set: cs, thresholdOverride: options.thresholdOverride });
    transitions.push({ change_set_id: cs.id, from: "proposed", to: "done" });
  }, failures);

  return {
    transitions,
    failures,
    started_at,
    finished_at: new Date().toISOString(),
  };
}

async function runStage(
  status: ChangeSetRow["status"],
  step: (cs: ChangeSetRow) => Promise<void>,
  failures: ProcessFailure[],
) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("change_sets")
    .select("*")
    .eq("status", status)
    .order("id");
  if (error) throw new Error(`Failed to load change_sets@${status}: ${error.message}`);

  const rows = (data ?? []) as unknown as ChangeSetRow[];
  for (const cs of rows) {
    try {
      await step(cs);
    } catch (e) {
      const reason = (e as Error).message ?? String(e);
      console.error(`change_set ${cs.id} failed at ${status}:`, reason);
      // Transient errors (rate limit, network) shouldn't park the change_set
      // in 'failed' — leave it where it is so the next tick retries automatically.
      // Only persistent errors (schema mismatch, missing rows) flip to 'failed'.
      if (isTransientError(reason)) {
        await db
          .from("change_sets")
          .update({ failure_reason: reason })
          .eq("id", cs.id);
      } else {
        await db
          .from("change_sets")
          .update({ status: "failed", failure_reason: reason })
          .eq("id", cs.id);
      }
      failures.push({ change_set_id: cs.id, at: status, error: reason });
    }
  }
}

function isTransientError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("rate-limit") ||
    m.includes("429") ||
    m.includes("503") ||
    m.includes("timeout") ||
    m.includes("etimedout") ||
    m.includes("econnreset")
  );
}
