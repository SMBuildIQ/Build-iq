"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DocumentSummary {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string | Date;
}

export function DocumentAttachments({
  entityType,
  entityId,
  documents,
}: {
  entityType: string;
  entityId: string;
  documents: DocumentSummary[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("entityType", entityType);
    form.set("entityId", entityId);
    form.set("file", file);
    const res = await fetch("/api/v1/documents", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not upload file");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Documents</div>
        <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium">
          {uploading ? "Uploading…" : "Attach file"}
          <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </div>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">No documents attached.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between">
              <a href={`/api/v1/documents/${doc.id}/file`} className="text-gray-900 underline" target="_blank" rel="noreferrer">
                {doc.filename}
              </a>
              <span className="text-xs text-gray-400">{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
