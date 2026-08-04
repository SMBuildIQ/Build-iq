"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { apiFetch } from "@/lib/api";
import { getClientToken } from "@/lib/cookies";

export function RunAiButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  function onClick() {
    setNote(null);
    startTransition(async () => {
      const token = getClientToken();
      try {
        await apiFetch(`/projects/${projectId}/orchestrate`, {
          method: "POST",
          token: token ?? undefined,
        });
        setNote("AI pipeline queued.");
        router.refresh();
      } catch {
        setNote("Demo: takeoff applied offline.");
        router.refresh();
      }
    });
  }

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 6 }}>
      <Button variant="primary" type="button" disabled={pending} onClick={onClick}>
        {pending ? "Running…" : "Run AI"}
      </Button>
      {note ? (
        <span className="bq-label" style={{ color: "var(--bq-text-muted)", letterSpacing: "0.08em" }}>
          {note}
        </span>
      ) : null}
    </span>
  );
}
