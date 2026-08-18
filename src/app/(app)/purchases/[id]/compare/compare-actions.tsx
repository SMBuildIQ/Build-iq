"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecommendButton({ purchaseRequestId }: { purchaseRequestId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ recommendedQuoteId: string; rationale: string } | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/purchase-requests/${purchaseRequestId}/recommend`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not generate a recommendation");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-700">AI recommendation</div>
        <button onClick={onClick} disabled={loading} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
          {loading ? "Analyzing…" : result ? "Regenerate" : "Generate recommendation"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="text-sm text-gray-700">{result.rationale}</p>}
      {!result && !error && <p className="text-sm text-gray-400">Weighs total landed cost, delivery, terms, warranty, and supplier reliability — not price alone.</p>}
    </div>
  );
}

export function SelectQuoteButton({ purchaseRequestId, quoteId }: { purchaseRequestId: string; quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/purchase-requests/${purchaseRequestId}/select-quote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not select this quote");
      return;
    }
    router.push(`/purchases/${purchaseRequestId}`);
    router.refresh();
  }

  return (
    <div>
      <button onClick={onClick} disabled={loading} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
        {loading ? "Selecting…" : "Select this quote"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function NegotiateButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; message: string } | null>(null);
  const [sent, setSent] = useState(false);

  async function onDraft() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/quotes/${quoteId}/negotiate`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not draft a negotiation");
      return;
    }
    const data = await res.json();
    setDraft({ id: data.negotiation.id, message: data.negotiation.messages[0]?.body ?? "" });
  }

  async function onSend() {
    if (!draft) return;
    setLoading(true);
    const res = await fetch(`/api/v1/negotiations/${draft.id}/send`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      setSent(true);
      router.refresh();
    }
  }

  if (sent) return <p className="text-xs text-green-700">Negotiation sent.</p>;

  return (
    <div className="mt-2">
      {!draft ? (
        <button onClick={onDraft} disabled={loading} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
          {loading ? "Drafting…" : "Draft negotiation"}
        </button>
      ) : (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
          <p className="mb-2 text-gray-700">{draft.message}</p>
          <button onClick={onSend} disabled={loading} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
            {loading ? "Sending…" : "Send negotiation"}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
