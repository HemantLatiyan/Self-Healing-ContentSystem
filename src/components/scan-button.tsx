"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ScanOutcome {
  kind: "no_change" | "baseline" | "change_detected" | "error";
}

interface ScanSummary {
  scanned: number;
  outcomes: ScanOutcome[];
}

export function ScanButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setLastSummary(null);
    try {
      const res = await fetch("/api/cron/scan", { method: "POST" });
      const json = (await res.json()) as ScanSummary | { error: string };
      if (!res.ok) {
        setLastSummary(`Error: ${"error" in json ? json.error : "unknown"}`);
        return;
      }
      if ("outcomes" in json) {
        const changed = json.outcomes.filter((o) => o.kind === "change_detected").length;
        const baseline = json.outcomes.filter((o) => o.kind === "baseline").length;
        const unchanged = json.outcomes.filter((o) => o.kind === "no_change").length;
        const errors = json.outcomes.filter((o) => o.kind === "error").length;
        const parts: string[] = [];
        if (changed) parts.push(`${changed} change${changed > 1 ? "s" : ""} detected`);
        if (baseline) parts.push(`${baseline} baselined`);
        if (unchanged) parts.push(`${unchanged} unchanged`);
        if (errors) parts.push(`${errors} error${errors > 1 ? "s" : ""}`);
        setLastSummary(parts.join(" · ") || "no sources");
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || isPending;

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onClick} disabled={disabled}>
        <RefreshCw className={disabled ? "animate-spin" : ""} />
        {busy ? "Scanning…" : "Scan now"}
      </Button>
      {lastSummary && (
        <span className="text-xs text-muted-foreground">{lastSummary}</span>
      )}
    </div>
  );
}
