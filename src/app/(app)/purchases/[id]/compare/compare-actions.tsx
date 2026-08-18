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

interface NegotiationMessage {
  id: string;
  direction: string;
  authorType: string;
  body: string;
}

interface NegotiationState {
  id: string;
  status: string; // proposed | sent | countered | accepted | declined | closed
  resultPrice: number | null;
  resultTerms: string | null;
  messages: NegotiationMessage[];
}

export function NegotiateButton({ quoteId, latestNegotiation }: { quoteId: string; latestNegotiation: NegotiationState | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [negotiation, setNegotiation] = useState<NegotiationState | null>(latestNegotiation);
  const [respondPrice, setRespondPrice] = useState("");
  const [respondTerms, setRespondTerms] = useState("");

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
    setNegotiation({ id: data.negotiation.id, status: data.negotiation.status, resultPrice: null, resultTerms: null, messages: data.negotiation.messages });
  }

  async function onSend() {
    if (!negotiation) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/negotiations/${negotiation.id}/send`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not send negotiation");
      return;
    }
    const data = await res.json();
    setNegotiation({ ...negotiation, status: data.negotiation.status });
    router.refresh();
  }

  async function onRespond(decision: "accepted" | "declined" | "countered") {
    if (!negotiation) return;
    if (decision !== "declined" && !respondPrice) {
      setError(`A price is required to record this as ${decision}`);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/negotiations/${negotiation.id}/respond`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        decision,
        resultPrice: decision !== "declined" ? Number(respondPrice) : undefined,
        resultTerms: respondTerms || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not record the response");
      return;
    }
    const data = await res.json();
    setNegotiation({ id: data.negotiation.id, status: data.negotiation.status, resultPrice: data.negotiation.resultPrice, resultTerms: data.negotiation.resultTerms, messages: data.negotiation.messages });
    router.refresh();
  }

  if (!negotiation) {
    return (
      <div className="mt-2">
        <button onClick={onDraft} disabled={loading} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
          {loading ? "Drafting…" : "Draft negotiation"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const outboundMessage = negotiation.messages.find((m) => m.direction === "outbound")?.body;

  return (
    <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs">
      {outboundMessage && <p className="mb-2 text-gray-700">{outboundMessage}</p>}

      {negotiation.status === "proposed" && (
        <button onClick={onSend} disabled={loading} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {loading ? "Sending…" : "Send negotiation"}
        </button>
      )}

      {negotiation.status === "sent" && (
        <div className="flex flex-col gap-2">
          <p className="text-gray-500">Sent — record what the supplier said back:</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Price $"
              value={respondPrice}
              onChange={(e) => setRespondPrice(e.target.value)}
              className="w-24 rounded border border-gray-300 px-2 py-1"
            />
            <input
              placeholder="Terms (optional)"
              value={respondTerms}
              onChange={(e) => setRespondTerms(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onRespond("accepted")} disabled={loading} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
              Accepted
            </button>
            <button onClick={() => onRespond("countered")} disabled={loading} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
              Countered
            </button>
            <button onClick={() => onRespond("declined")} disabled={loading} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50">
              Declined
            </button>
          </div>
        </div>
      )}

      {negotiation.status === "accepted" && (
        <p className="text-green-700">
          Accepted at ${negotiation.resultPrice?.toLocaleString()}
          {negotiation.resultTerms ? `, ${negotiation.resultTerms}` : ""}.
        </p>
      )}
      {negotiation.status === "declined" && <p className="text-red-700">Supplier declined.</p>}
      {negotiation.status === "countered" && (
        <div>
          <p className="mb-2 text-amber-700">
            Countered at ${negotiation.resultPrice?.toLocaleString()}
            {negotiation.resultTerms ? `, ${negotiation.resultTerms}` : ""}.
          </p>
          <button onClick={onDraft} disabled={loading} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
            {loading ? "Drafting…" : "Draft another round"}
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
