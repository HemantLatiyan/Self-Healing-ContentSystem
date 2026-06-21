// Apply schema migration(s) + seed against the Supabase Postgres named by DATABASE_URL.
// Requires `psql` on PATH (Homebrew: `brew install libpq && brew link --force libpq`).

import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

for (const f of [".env.local", ".env"]) {
  if (existsSync(f)) process.loadEnvFile(f);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local.");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const seedPath = join(process.cwd(), "supabase", "seed.sql");

const psql = (args: string[]) =>
  execSync(`psql ${args.map((a) => `"${a}"`).join(" ")}`, { stdio: "inherit" });

console.log("Dropping public schema for a clean reset…");
psql([url, "-v", "ON_ERROR_STOP=1", "-c", "drop schema public cascade; create schema public;"]);

for (const m of migrations) {
  const p = join(migrationsDir, m);
  console.log(`→ migration: ${m}`);
  psql([url, "-v", "ON_ERROR_STOP=1", "-f", p]);
}

console.log("→ seed: seed.sql");
psql([url, "-v", "ON_ERROR_STOP=1", "-f", seedPath]);

execSync("npm run seed:files --silent", { stdio: "inherit" });

console.log("Database reset complete.");
