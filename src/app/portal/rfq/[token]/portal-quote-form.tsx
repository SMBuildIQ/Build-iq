"use client";

import { useState } from "react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
}

export function PortalQuoteForm({
  token,
  lineItems,
  existingQuote,
  declined,
}: {
  token: string;
  lineItems: LineItem[];
  existingQuote: { freight: number | null; leadTimeDays: number | null; paymentTerms: string | null } | null;
  declined: boolean;
}) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [freight, setFreight] = useState(existingQuote?.freight?.toString() ?? "");
  const [freightIncluded, setFreightIncluded] = useState(false);
  const [leadTimeDays, setLeadTimeDays] = useState(existingQuote?.leadTimeDays?.toString() ?? "");
  const [paymentTerms, setPaymentTerms] = useState(existingQuote?.paymentTerms ?? "Net 30");
  const [warranty, setWarranty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit(action: "submit" | "decline") {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/v1/portal/rfq/${token}/quote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action,
        lineItems: lineItems.map((li) => ({ rfqLineItemId: li.id, unitPrice: Number(prices[li.id] ?? 0) })),
        freight: freight ? Number(freight) : null,
        freightIncluded,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
        paymentTerms,
        warranty: warranty || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not submit");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">Thank you — your response has been recorded.</div>;
  }
  if (declined) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-gray-500">Unit price per line item</div>
        {lineItems.map((li) => (
          <label key={li.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex-1">{li.description}</span>
            <input
              type="number"
              step="0.01"
              placeholder="Unit price"
              value={prices[li.id] ?? ""}
              onChange={(e) => setPrices({ ...prices, [li.id]: e.target.value })}
              className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Freight ($)</span>
          <input type="number" value={freight} onChange={(e) => setFreight(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={freightIncluded} onChange={(e) => setFreightIncluded(e.target.checked)} />
          Freight included in unit prices
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Lead time (days)</span>
          <input type="number" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Payment terms</span>
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1" />
        </label>
        <label className="col-span-2 flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-gray-500">Warranty</span>
          <input value={warranty} onChange={(e) => setWarranty(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1" />
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => submit("submit")}
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit quote"}
        </button>
        <button
          onClick={() => submit("decline")}
          disabled={submitting}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          Decline to quote
        </button>
      </div>
    </div>
  );
}
