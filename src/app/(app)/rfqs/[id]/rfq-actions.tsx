"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SendRfqButton({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSend() {
    setSending(true);
    setError(null);
    const res = await fetch(`/api/v1/rfqs/${rfqId}/send`, { method: "POST" });
    setSending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not send RFQ");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button onClick={onSend} disabled={sending} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {sending ? "Sending…" : "Send RFQ to suppliers"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function ManualQuoteForm({
  rfqSupplierId,
  lineItems,
}: {
  rfqSupplierId: string;
  lineItems: { id: string; description: string; quantity: number }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [freight, setFreight] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-gray-500 underline">
        Enter quote manually (from PDF/Excel/email)
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/v1/rfq-suppliers/${rfqSupplierId}/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineItems: lineItems.map((li) => ({ rfqLineItemId: li.id, unitPrice: Number(prices[li.id] ?? 0) })),
        freight: freight ? Number(freight) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
        paymentTerms,
        sourceType: "manual",
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save quote");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-2 rounded-md border border-gray-200 p-3">
      {lineItems.map((li) => (
        <label key={li.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex-1">{li.description}</span>
          <input
            type="number"
            step="0.01"
            placeholder="Unit price"
            value={prices[li.id] ?? ""}
            onChange={(e) => setPrices({ ...prices, [li.id]: e.target.value })}
            className="w-24 rounded border border-gray-300 px-2 py-1"
          />
        </label>
      ))}
      <div className="flex gap-2">
        <input type="number" placeholder="Freight $" value={freight} onChange={(e) => setFreight(e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-xs" />
        <input type="number" placeholder="Lead time (days)" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} className="w-32 rounded border border-gray-300 px-2 py-1 text-xs" />
        <input placeholder="Payment terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="w-28 rounded border border-gray-300 px-2 py-1 text-xs" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          {submitting ? "Saving…" : "Save quote"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}
