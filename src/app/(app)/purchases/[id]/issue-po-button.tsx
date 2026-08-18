"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssuePoButton({ purchaseRequestId, quoteId }: { purchaseRequestId: string; quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/v1/purchase-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purchaseRequestId, quoteId }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not issue purchase order");
      return;
    }
    const data = await res.json();
    router.push(`/orders/${data.purchaseOrder.id}`);
  }

  return (
    <div>
      <button onClick={onClick} disabled={loading} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading ? "Issuing…" : "Issue purchase order"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
