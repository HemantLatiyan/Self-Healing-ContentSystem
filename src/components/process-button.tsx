"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Cpu } from "lucide-react";

interface Transition {
  change_set_id: number;
  from: string;
  to: string;
}
interface Failure {
  change_set_id: number;
  at: string;
  error: string;
}
interface ProcessReport {
  transitions: Transition[];
  failures: Failure[];
}

export function ProcessButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setLast(null);
    try {
      const res = await fetch("/api/cron/process", { method: "POST" });
      const json = (await res.json()) as ProcessReport | { error: string };
      if (!res.ok || "error" in json) {
        setLast(`Error: ${"error" in json ? json.error : "unknown"}`);
        return;
      }
      const t = json.transitions.length;
      const f = json.failures.length;
      setLast(
        t === 0 && f === 0
          ? "nothing to process"
          : `${t} transition${t === 1 ? "" : "s"}` +
              (f > 0 ? ` · ${f} failure${f === 1 ? "" : "s"}` : ""),
      );
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending;

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={onClick} disabled={disabled}>
        <Cpu className={disabled ? "animate-pulse" : ""} />
        {busy ? "Processing…" : "Process now"}
      </Button>
      {last && <span className="text-xs text-muted-foreground">{last}</span>}
    </div>
  );
}
