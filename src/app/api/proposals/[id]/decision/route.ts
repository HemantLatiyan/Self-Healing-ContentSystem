import { type NextRequest, NextResponse } from "next/server";
import { applyReviewDecision, type ReviewDecision } from "@/lib/pipeline/review";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface DecisionBody {
  kind?: "approve" | "edit_and_approve" | "reject";
  edited_body?: string;
  notes?: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proposal_id = Number(id);
  if (!Number.isInteger(proposal_id) || proposal_id <= 0) {
    return NextResponse.json({ error: "invalid proposal id" }, { status: 400 });
  }

  let body: DecisionBody;
  try {
    body = (await req.json()) as DecisionBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const decision = parseDecision(body);
  if (decision instanceof Error) {
    return NextResponse.json({ error: decision.message }, { status: 400 });
  }

  try {
    const result = await applyReviewDecision(proposal_id, decision);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}

function parseDecision(body: DecisionBody): ReviewDecision | Error {
  switch (body.kind) {
    case "approve":
      return { kind: "approve", notes: body.notes };
    case "reject":
      return { kind: "reject", notes: body.notes };
    case "edit_and_approve":
      if (!body.edited_body || body.edited_body.trim().length === 0) {
        return new Error("edit_and_approve requires non-empty edited_body");
      }
      return {
        kind: "edit_and_approve",
        edited_body: body.edited_body,
        notes: body.notes,
      };
    default:
      return new Error(
        "kind must be one of: approve, edit_and_approve, reject",
      );
  }
}
