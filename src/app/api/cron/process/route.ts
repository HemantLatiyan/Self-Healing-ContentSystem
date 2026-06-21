import { type NextRequest, NextResponse } from "next/server";
import { runProcessTick } from "@/lib/pipeline/process";
import { isCronAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const override = req.nextUrl.searchParams.get("threshold");
    const thresholdOverride = override == null ? undefined : Number(override);
    if (thresholdOverride !== undefined && Number.isNaN(thresholdOverride)) {
      return NextResponse.json(
        { error: "threshold must be a number between 0 and 1" },
        { status: 400 },
      );
    }
    const report = await runProcessTick({ thresholdOverride });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}
export async function GET(req: NextRequest) {
  return handle(req);
}
