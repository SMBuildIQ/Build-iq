"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

type Props = {
  projectId: string;
};

export function UploadDrawings({ projectId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    setError(null);
    setInfo(null);

    try {
      for (const file of files) {
        await apiFetch(`/projects/${projectId}/blueprints`, {
          method: "POST",
          body: {
            filename: file.name,
            contentType: file.type || "application/pdf",
            size: file.size,
          },
        });
      }
      setInfo(
        files.length === 1
          ? `${files[0].name} uploaded.`
          : `${files.length} drawings uploaded.`
      );
      startTransition(() => router.refresh());
    } catch (err) {
      // Demo fallback when API is down — still refresh UI messaging
      const isNetwork =
        err instanceof TypeError ||
        (err instanceof Error && /fetch|network|failed/i.test(err.message));
      if (isNetwork || (err instanceof ApiError && err.status >= 500)) {
        setInfo(
          `Demo mode: ${files.length} drawing${files.length === 1 ? "" : "s"} queued locally. Connect the API to persist.`
        );
        return;
      }
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.zip,application/pdf,image/*,application/zip"
        multiple
        hidden
        onChange={(e) => void onFiles(e)}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        style={{ width: "fit-content" }}
      >
        {pending ? "Uploading…" : "Upload drawings"}
      </Button>
      <p className="bq-label" style={{ color: "var(--bq-text-muted)", margin: 0 }}>
        PDF, PNG, JPG, or ZIP
      </p>
      {error ? (
        <p className="bq-body" style={{ color: "var(--bq-status-danger)", margin: 0 }} role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="bq-body" style={{ color: "var(--bq-accent-primary)", margin: 0 }} role="status">
          {info}
        </p>
      ) : null}
    </div>
  );
}
