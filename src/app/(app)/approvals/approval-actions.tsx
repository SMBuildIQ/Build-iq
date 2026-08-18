"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecideButtons({ stepId, canDecide }: { stepId: string; canDecide: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  async function decide(decision: "approve" | "reject" | "request_changes") {
    setLoading(decision);
    setError(null);
    const res = await fetch(`/api/v1/approval-steps/${stepId}/decide`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, comments: comments || undefined }),
    });
    setLoading(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not record decision");
      return;
    }
    router.refresh();
  }

  if (!canDecide) {
    return <p className="text-xs text-gray-400">Awaiting a different approver role.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        placeholder="Comments (optional)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs"
      />
      <div className="flex gap-2">
        <button onClick={() => decide("approve")} disabled={!!loading} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {loading === "approve" ? "…" : "Approve"}
        </button>
        <button onClick={() => decide("reject")} disabled={!!loading} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">
          {loading === "reject" ? "…" : "Reject"}
        </button>
        <button onClick={() => decide("request_changes")} disabled={!!loading} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
          {loading === "request_changes" ? "…" : "Request changes"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
