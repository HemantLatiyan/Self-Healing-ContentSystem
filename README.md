# Self-Healing Content System

🔗 **Live Deployment:** [self-healing-content-system.vercel.app](https://self-healing-content-system.vercel.app/)

A pipeline that watches source documents, detects meaningful changes, locates the learning content built on top of them, and either auto-publishes a patch or routes it to a reviewer based on a deterministic confidence score.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 + shadcn/ui · Supabase Postgres · Gemini via Vercel AI SDK.

## Overview

Source files live under `seeds/sources/`. On scan, each is normalized and hashed; a divergent hash creates a `change_set`. The processor then walks the change_set through a five-stage state machine — semantic diff, impact analysis, patch proposal, auto-heal gate, done — emitting a `patch_proposal` per impacted content item. Proposals at or above the auto-heal threshold publish without review and are recorded in `audit_log`; everything else lands in a reviewer queue at `/proposals`.

The change_set state machine:

```
detected → diffed → impacted → proposed → done
              │         │
              └─── (failure / transient error parks the row;
                   next /api/cron/process tick re-picks it)
```

## Architecture

<img width="668" height="1009" alt="SHCS_SystemDesign" src="https://github.com/user-attachments/assets/58000add-422b-4818-b0c9-d83d804b5e56" />

```
seeds/sources/*.md
        │
        ▼
/api/cron/scan        ── read, normalize, sha256, snapshot, change_set
        │
        ▼
/api/cron/process     ── state-machine driver, idempotent per call
        │
        ├── runDiffStep        Gemini → severity, summary, changed_concepts
        ├── runImpactStep      SQL: source_concepts → content_concepts
        ├── runProposalStep    Gemini per impacted content; composite confidence
        └── runGateStep        ≥ threshold → content_versions + audit_log
                               < threshold → leave pending → reviewer queue
```

Postgres carries the knowledge graph as plain tables (`concepts`, `source_concepts`, `content_concepts`) — no graph DB. The reviewer UI is server-rendered, with small client components for the scan/process buttons and the approve/reject form. All DB writes inside route handlers go through the service-role admin client in [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts) so they bypass RLS deterministically; the `@supabase/ssr` publishable-key client is kept around for future user-scoped reads but currently unused.

Confidence is a deterministic composite, not a model-self-report:

```
confidence =
    0.30 · model_self_score
  + 0.25 · (1 − patch_size_ratio)
  + 0.25 · severity_factor          (trivial 1.0 · minor 0.7 · major 0.3)
  + 0.20 · citation_overlap         (cited concepts ∩ source concepts)
```

Each component is persisted in `patch_proposals.confidence_breakdown` JSONB and rendered as a table on the proposal detail page, so a reviewer can see *why* a score came out where it did.

## Schema

| Table | Purpose |
|---|---|
| `sources` | Tracked files. `latest_hash` + `latest_snapshot_id` shortcut the "what's current?" lookup. |
| `snapshots` | Immutable copies of each source at every detected change, raw + normalized. |
| `concepts`, `source_concepts`, `content_concepts` | The relational concept graph. Hand-authored in [supabase/seed.sql](supabase/seed.sql). |
| `content`, `content_versions` | Current pointer + immutable history of every learning item. Auto-heal and reviewer approvals both write `content_versions` rows. |
| `change_sets` | State-machine row: `detected → diffed → impacted → proposed → done` / `failed`, plus the LLM's severity / summary / changed_concepts. |
| `change_set_impacts` | Persisted impact set per change_set — preserves "which content was considered" for replay and audit. |
| `patch_proposals` | One per (change_set, content). Holds old/proposed body, confidence + breakdown, status enum. |
| `audit_log` | Every publish (auto-heal or human) + every review decision. |

All migrations live in [supabase/migrations/](supabase/migrations/) — append-only, applied in order by `npm run db:reset`.

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com/dashboard). From **Settings → API** copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

From **Settings → Database → Connection string** copy the URI (Session pooler works) → `DATABASE_URL`.

### 2. Gemini key

Generate a key at [aistudio.google.com](https://aistudio.google.com/app/apikey) → `GEMINI_API_KEY`. The default model is `gemini-3.1-flash-lite`; override with `GEMINI_MODEL` if needed.

### 3. Env file

```bash
cp .env.example .env.local
# fill in the values
```

### 4. Install + reset DB

```bash
npm install
npm run db:reset    # drops public schema, applies migrations, loads seed, restores v1 source files
```

`db:reset` shells out to `psql`. On macOS: `brew install libpq && brew link --force libpq`.

### 5. Run

```bash
npm run dev
```

### Triggering a source change

The "working" source file is the unsuffixed one (`source1_exam_guide.md`); `*_v1.md` and `*_v2.md` are the staged baselines. To stage a change:

```bash
npm run promote -- 1 v2     # overwrites source1_exam_guide.md with the v2 contents
npm run seed:files          # restore both working files to their v1 baselines
```

Then hit **Scan now** in the UI (or `POST /api/cron/scan`), followed by **Process now**.

### Scheduling the pipeline

`/api/cron/scan` and `/api/cron/process` accept both POST and GET, and are idempotent — a tick with no work is a 200 with empty `transitions`/`outcomes`. Wire them up to whatever scheduler you prefer.

For an external scheduler like [cron-job.org](https://cron-job.org):

1. Set `CRON_SECRET` to a random string in the deployed environment.
2. Create two GET jobs against the deployed URLs (stagger by a couple of minutes — `scan` first, then `process`):
   - `https://<deploy>/api/cron/scan`
   - `https://<deploy>/api/cron/process`
3. On each job, add a request header `Authorization: Bearer <CRON_SECRET>`.

[src/lib/cron-auth.ts](src/lib/cron-auth.ts) gates both routes: requests without the bearer token (or same-origin context) get a 401. Leaving `CRON_SECRET` unset is also valid — the guard short-circuits to allow, which is the right default for local dev.

## Key technical decisions

- **Hand-authored concept graph, not LLM-bootstrapped.** Production would extract concepts from a source at registration with an LLM pass. For the take-home, [supabase/seed.sql](supabase/seed.sql) hand-authors sources, concepts, source↔concept and content↔concept edges, and an initial `content_versions` row per item. This isolates the runtime pipeline from extraction noise during evaluation.
- **No chunking at the diff or proposal stage.** Both LLM calls take the full normalized snapshot. The seeded sources are deliberately small enough to fit one context window. Chunking by markdown heading is the obvious next step but adds tokens, retries, and aggregation logic that aren't load-bearing for the demo.
- **Postgres-as-graph.** `concepts` + join tables. Two-hop traversal (`source_concepts → content_concepts`) is a single SQL `IN` query. A graph DB would buy nothing at this scale and add infrastructure.
- **Single state machine, idempotent per call.** `/api/cron/process` advances every open change_set one stage and returns. Hitting it twice doesn't double-spend tokens. Transient errors (rate limit, timeout) leave the change_set at its current status with a `failure_reason` so the next tick retries automatically; only persistent errors flip to `failed`.
- **Composite confidence over model self-report.** Models are poor calibrators of their own work. The composite (model_self_score, patch_size_ratio, severity_factor, citation_overlap) is deterministic and inspectable — the reviewer can see which signal dragged the score down.
- **Supersede on insert.** When a new proposal lands for a content_id that already has a `pending` proposal, the old one flips to `superseded` before insert. Reviewers never see stale fixes.
- **Vercel AI SDK with `generateObject` + Zod schemas.** Schema-validated structured output. No agent loops, no tool calls — the pipeline is deterministic by design.
- **Service-role client for all pipeline writes; publishable-key SSR client reserved for future user-scoped reads.** RLS isn't configured because there's no auth model to attach it to; that's the next prerequisite, not a current bug.
- **v1/v2 file convention.** Versioned source files live alongside the working file so a reviewer can stage a change deterministically (`promote 1 v2`) without crafting markdown by hand. The runtime is version-agnostic — it just reads the working file.

## Limitations and next steps

- **No auth.** Reviewer identity is hardcoded as `reviewer`. Adding Supabase Auth would let `reviewer_id` derive from a session and unlock RLS for multi-tenant deployments.
- **No real concept extraction.** The graph is seeded by hand. Production would run an extraction prompt at source registration and let the reviewer curate the edges.
- **No chunking.** Sources larger than ~50KB will start failing the diff or proposal step with context-window errors. Section-level diffs (by heading) with per-section severity aggregation are the natural fix.
- **Single global threshold.** `AUTO_HEAL_THRESHOLD` applies to every content type. Per-type or per-source thresholds would let trivia-style flashcards heal more aggressively than long-form rationales.
- **Polling, not streaming.** The reviewer hits "Scan now" / "Process now" rather than reacting to a webhook or background worker. For production: Vercel Cron or a Supabase scheduled function on the same routes.
- **No retry budget on transient errors.** A change_set with a permanent upstream issue (e.g. a deleted concept) would currently keep getting retried. A small attempt counter with a backoff cap belongs in [src/lib/pipeline/process.ts](src/lib/pipeline/process.ts).
- **Patch quality varies with model.** The propose prompt is general; for concept-retirement cases (e.g. a case study being removed from an exam) the model sometimes leaves the lead paragraph untouched. Tighter prompting and a few-shot example for retirement scenarios is a small, isolated improvement.

## Troubleshooting

- **`permission denied for schema public`** — re-run `npm run db:reset`. The migration grants `service_role` access on the public schema explicitly; `drop schema public cascade` (inside `db:reset`) wipes Supabase's defaults so the grants in [0001_init.sql](supabase/migrations/0001_init.sql) restore them.
- **Process button does nothing** — likely a change_set parked at `status='failed'` from a prior error. Inspect via psql: `select id, status, failure_reason from change_sets;`. To retry, flip back to the last good status: `update change_sets set status='impacted', failure_reason=null where id=<X>;`.
- **`psql` not found** — `brew install libpq && brew link --force libpq` on macOS.

## Project layout

```
seeds/sources/         # source markdown files (v1, v2, and the working copy)
supabase/
  migrations/          # numbered SQL migrations (append-only)
  seed.sql             # hand-authored sources / concepts / content / graph edges
scripts/               # db:reset, seed:files, promote helpers (tsx)
src/
  app/                 # App Router pages + route handlers
    api/cron/scan/     # POST: read sources, hash, emit change_sets
    api/cron/process/  # POST: drive change_set state machine one tick
    api/proposals/[id]/decision/   # POST: approve / edit_and_approve / reject
    proposals/         # reviewer queue + detail page
    activity/          # audit log + change_set timeline
  components/          # pending hero, split-diff, pipeline indicator, top nav, …
  lib/
    pipeline/          # diff, impact, propose, publish (auto-heal), review
    ai/                # Gemini provider + Zod schemas for LLM output
    db/                # row types, queries (server-only)
    supabase/          # admin (service-role) + client (publishable, @supabase/ssr)
    scan/              # normalize, sha256, scan orchestrator
```
