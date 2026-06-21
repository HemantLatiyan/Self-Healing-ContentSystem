"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the dev console; production wiring (Sentry, etc.) goes here.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 px-6 py-12">
      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
        <AlertTriangle className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Something broke on this page.</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        The most common causes here are a stale Supabase connection, a missing env var,
        or a Gemini quota error during a pipeline step. Retry first; if it persists, check
        the dev-server logs.
      </p>
      <pre className="w-full overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
        {error.message}
        {error.digest && `\n\ndigest: ${error.digest}`}
      </pre>
      <Button size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
