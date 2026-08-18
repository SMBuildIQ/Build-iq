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
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [freight, setFreight] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractNote, setExtractNote] = useState<string | null>(null);
  const [extractionDocumentId, setExtractionDocumentId] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-medium text-gray-500 underline">
        Enter quote manually (from PDF/Excel/email)
      </button>
    );
  }

  async function onUploadAndExtract(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setExtracting(true);
    setExtractNote(null);
    setError(null);

    const form = new FormData();
    form.set("entityType", "rfq_supplier");
    form.set("entityId", rfqSupplierId);
    form.set("file", file);
    const uploadRes = await fetch("/api/v1/documents", { method: "POST", body: form });
    if (!uploadRes.ok) {
      setExtracting(false);
      const body = await uploadRes.json().catch(() => ({}));
      setError(body.error ?? "Could not upload file");
      return;
    }
    const { document } = await uploadRes.json();

    const extractRes = await fetch(`/api/v1/rfq-suppliers/${rfqSupplierId}/quotes/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });
    setExtracting(false);
    if (!extractRes.ok) {
      const body = await extractRes.json().catch(() => ({}));
      setError(body.error ?? "Could not extract quote");
      return;
    }
    const result = await extractRes.json();
    if (!result.available) {
      setExtractNote(result.reason ?? "Extraction unavailable — enter the quote manually below.");
      return;
    }

    setExtractionDocumentId(result.documentId);
    const newPrices: Record<string, string> = {};
    const newConfidence: Record<string, number> = {};
    for (const li of result.fields.lineItems) {
      if (li.rfqLineItemId) {
        newPrices[li.rfqLineItemId] = String(li.unitPrice);
        newConfidence[li.rfqLineItemId] = li.confidence;
      }
    }
    setPrices((prev) => ({ ...prev, ...newPrices }));
    setConfidence(newConfidence);
    if (result.fields.freight !== null) setFreight(String(result.fields.freight));
    if (result.fields.leadTimeDays !== null) setLeadTimeDays(String(result.fields.leadTimeDays));
    if (result.fields.paymentTerms) setPaymentTerms(result.fields.paymentTerms);
    setExtractNote(
      `Extracted ${result.fields.lineItems.length} line item(s) — review every value before saving, especially anything marked low confidence.`
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
        lineItems: lineItems.map((li) => ({
          rfqLineItemId: li.id,
          unitPrice: Number(prices[li.id] ?? 0),
          ...(extractionDocumentId && confidence[li.id] !== undefined
            ? { extractedUnitPrice: Number(prices[li.id] ?? 0), extractedConfidence: confidence[li.id] }
            : {}),
        })),
        freight: freight ? Number(freight) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
        paymentTerms,
        sourceType: extractionDocumentId ? "pdf" : "manual",
        extractionDocumentId: extractionDocumentId ?? undefined,
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
      <label className="cursor-pointer self-start rounded-md border border-gray-300 px-2 py-1 text-xs font-medium">
        {extracting ? "Extracting…" : "Upload quote document (AI-assisted)"}
        <input type="file" className="hidden" onChange={onUploadAndExtract} disabled={extracting} accept=".csv,.pdf,.png,.jpg,.jpeg,.xlsx" />
      </label>
      {extractNote && <p className="text-xs text-gray-500">{extractNote}</p>}

      {lineItems.map((li) => (
        <label key={li.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="flex-1">{li.description}</span>
          {confidence[li.id] !== undefined && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${confidence[li.id] < 0.6 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"}`}>
              {Math.round(confidence[li.id] * 100)}%
            </span>
          )}
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
