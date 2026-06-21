import "server-only";
import type { NextRequest } from "next/server";

/**
 * Guard for `/api/cron/*` routes.
 *
 * Allow rules (any one passes):
 *   1. `CRON_SECRET` is not configured → open (dev / local).
 *   2. `Authorization: Bearer <CRON_SECRET>` matches → external cron caller.
 *   3. `Sec-Fetch-Site: same-origin` → the dashboard buttons hitting their own host.
 */
export function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const auth = req.headers.get("authorization");
  if (auth && timingSafeEqual(auth, `Bearer ${secret}`)) return true;

  if (req.headers.get("sec-fetch-site") === "same-origin") return true;

  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
