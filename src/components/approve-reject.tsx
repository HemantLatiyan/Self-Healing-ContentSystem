"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Pencil, X } from "lucide-react";

interface Props {
  proposalId: number;
  proposedBody: string;
}

type DecisionKind = "approve" | "edit_and_approve" | "reject";

export function ApproveReject({ proposalId, proposedBody }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(proposedBody);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(kind: DecisionKind) {
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { kind, notes: notes || undefined };
      if (kind === "edit_and_approve") body.edited_body = editedBody;
      const res = await fetch(`/api/proposals/${proposalId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }
      startTransition(() => router.push("/proposals"));
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Remarks (optional)
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why are you approving or rejecting this patch?"
          rows={2}
          disabled={disabled}
        />
      </div>

      {editing && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Edited content body
          </label>
          <Textarea
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
            rows={Math.max(6, Math.min(20, editedBody.split("\n").length + 2))}
            disabled={disabled}
            className="font-mono text-xs"
          />
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button onClick={() => submit("edit_and_approve")} disabled={disabled}>
              <Check />
              Save edits & approve
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setEditedBody(proposedBody);
              }}
              disabled={disabled}
            >
              Cancel edits
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => submit("approve")} disabled={disabled}>
              <Check />
              Approve as-is
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              disabled={disabled}
            >
              <Pencil />
              Edit & approve
            </Button>
            <Button
              variant="ghost"
              onClick={() => submit("reject")}
              disabled={disabled}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X />
              Reject
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
