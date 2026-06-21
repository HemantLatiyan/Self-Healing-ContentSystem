import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SourceRow } from "@/lib/db/types";
import { normalize } from "./normalize";
import { sha256 } from "./hash";

const SOURCES_DIR = path.join(process.cwd(), "seeds", "sources");

export type ScanOutcome =
  | { kind: "no_change"; source_id: number; hash: string }
  | { kind: "baseline"; source_id: number; snapshot_id: number; hash: string }
  | {
      kind: "change_detected";
      source_id: number;
      snapshot_id: number;
      change_set_id: number;
      hash: string;
    }
  | { kind: "error"; source_id: number; reason: string };

export interface ScanSummary {
  scanned: number;
  outcomes: ScanOutcome[];
  started_at: string;
  finished_at: string;
}

export async function scanAllSources(): Promise<ScanSummary> {
  const started_at = new Date().toISOString();
  const db = supabaseAdmin();

  const { data: sources, error } = await db
    .from("sources")
    .select("*")
    .order("id");

  if (error) throw new Error(`Failed to load sources: ${error.message}`);
  const rows = (sources ?? []) as unknown as SourceRow[];

  const outcomes: ScanOutcome[] = [];
  for (const source of rows) outcomes.push(await scanOne(source));

  return {
    scanned: rows.length,
    outcomes,
    started_at,
    finished_at: new Date().toISOString(),
  };
}

async function scanOne(source: SourceRow): Promise<ScanOutcome> {
  const filePath = path.join(SOURCES_DIR, source.location);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (e) {
    return {
      kind: "error",
      source_id: source.id,
      reason: `Could not read ${filePath}: ${(e as Error).message}`,
    };
  }

  const normalized = normalize(raw);
  const hash = sha256(normalized);

  if (source.latest_hash === hash) {
    return { kind: "no_change", source_id: source.id, hash };
  }

  const db = supabaseAdmin();

  const { data: snapshot, error: snapErr } = await db
    .from("snapshots")
    .insert({
      source_id: source.id,
      raw_content: raw,
      normalized_content: normalized,
      hash,
    })
    .select("id")
    .single();

  if (snapErr || !snapshot) {
    return {
      kind: "error",
      source_id: source.id,
      reason: `Snapshot insert failed: ${snapErr?.message ?? "no row"}`,
    };
  }
  const snapshot_id = snapshot.id as number;

  // Baseline (first scan ever for this source) — record the snapshot but do not
  // emit a change_set. There is nothing meaningful to diff against yet.
  if (source.latest_hash === null) {
    await db
      .from("sources")
      .update({
        latest_hash: hash,
        latest_snapshot_id: snapshot_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", source.id);
    return { kind: "baseline", source_id: source.id, snapshot_id, hash };
  }

  const { data: change_set, error: csErr } = await db
    .from("change_sets")
    .insert({
      source_id: source.id,
      prev_snapshot_id: source.latest_snapshot_id,
      new_snapshot_id: snapshot_id,
      status: "detected",
    })
    .select("id")
    .single();

  if (csErr || !change_set) {
    return {
      kind: "error",
      source_id: source.id,
      reason: `change_set insert failed: ${csErr?.message ?? "no row"}`,
    };
  }

  await db
    .from("sources")
    .update({
      latest_hash: hash,
      latest_snapshot_id: snapshot_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id);

  return {
    kind: "change_detected",
    source_id: source.id,
    snapshot_id,
    change_set_id: change_set.id as number,
    hash,
  };
}
