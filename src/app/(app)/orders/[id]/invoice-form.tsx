"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface POLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export function InvoiceForm({ purchaseOrderId, lineItems }: { purchaseOrderId: string; lineItems: POLineItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [freight, setFreight] = useState("");
  const [tax, setTax] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractNote, setExtractNote] = useState<string | null>(null);
  const [extractionDocumentId, setExtractionDocumentId] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium">
        Record invoice
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
    form.set("entityType", "purchase_order");
    form.set("entityId", purchaseOrderId);
    form.set("file", file);
    const uploadRes = await fetch("/api/v1/documents", { method: "POST", body: form });
    if (!uploadRes.ok) {
      setExtracting(false);
      const body = await uploadRes.json().catch(() => ({}));
      setError(body.error ?? "Could not upload file");
      return;
    }
    const { document } = await uploadRes.json();

    const extractRes = await fetch(`/api/v1/purchase-orders/${purchaseOrderId}/invoices/extract`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId: document.id }),
    });
    setExtracting(false);
    if (!extractRes.ok) {
      const body = await extractRes.json().catch(() => ({}));
      setError(body.error ?? "Could not extract invoice");
      return;
    }
    const result = await extractRes.json();
    if (!result.available) {
      setExtractNote(result.reason ?? "Extraction unavailable — enter the invoice manually below.");
      return;
    }

    setExtractionDocumentId(result.documentId);
    const newQuantities: Record<string, string> = {};
    const newPrices: Record<string, string> = {};
    const newConfidence: Record<string, number> = {};
    for (const li of result.fields.lineItems) {
      if (li.purchaseOrderLineItemId) {
        newQuantities[li.purchaseOrderLineItemId] = String(li.quantity);
        newPrices[li.purchaseOrderLineItemId] = String(li.unitPrice);
        newConfidence[li.purchaseOrderLineItemId] = li.confidence;
      }
    }
    setQuantities((prev) => ({ ...prev, ...newQuantities }));
    setPrices((prev) => ({ ...prev, ...newPrices }));
    setConfidence(newConfidence);
    if (result.fields.invoiceNumber) setInvoiceNumber(result.fields.invoiceNumber);
    if (result.fields.freight !== null) setFreight(String(result.fields.freight));
    if (result.fields.tax !== null) setTax(String(result.fields.tax));
    if (result.fields.amount !== null) setAmount(String(result.fields.amount));
    setExtractNote(
      `Extracted ${result.fields.lineItems.length} line item(s) — review every value before saving, especially anything marked low confidence.`
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      supplierInvoiceNumber: invoiceNumber || undefined,
      amount: Number(amount || 0),
      freight: freight ? Number(freight) : undefined,
      tax: tax ? Number(tax) : undefined,
      lineItems: lineItems.map((li) => ({
        purchaseOrderLineItemId: li.id,
        quantity: Number(quantities[li.id] ?? li.quantity),
        unitPrice: Number(prices[li.id] ?? li.unitPrice),
        ...(extractionDocumentId && confidence[li.id] !== undefined
          ? { extractedUnitPrice: Number(prices[li.id] ?? li.unitPrice), extractedConfidence: confidence[li.id] }
          : {}),
      })),
      extractionDocumentId: extractionDocumentId ?? undefined,
    };
    const res = await fetch(`/api/v1/purchase-orders/${purchaseOrderId}/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not record invoice");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <label className="cursor-pointer self-start rounded-md border border-gray-300 px-2 py-1 text-xs font-medium">
        {extracting ? "Extracting…" : "Upload invoice document (AI-assisted)"}
        <input type="file" className="hidden" onChange={onUploadAndExtract} disabled={extracting} accept=".csv,.pdf,.png,.jpg,.jpeg,.xlsx" />
      </label>
      {extractNote && <p className="text-xs text-gray-500">{extractNote}</p>}

      <input placeholder="Supplier invoice #" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
      {lineItems.map((li) => (
        <div key={li.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1">{li.description}</span>
          {confidence[li.id] !== undefined && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${confidence[li.id] < 0.6 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"}`}>
              {Math.round(confidence[li.id] * 100)}%
            </span>
          )}
          <input type="number" placeholder="Qty" value={quantities[li.id] ?? String(li.quantity)} onChange={(e) => setQuantities({ ...quantities, [li.id]: e.target.value })} className="w-20 rounded-md border border-gray-300 px-2 py-1" />
          <input type="number" step="0.01" placeholder="Unit price" value={prices[li.id] ?? String(li.unitPrice)} onChange={(e) => setPrices({ ...prices, [li.id]: e.target.value })} className="w-28 rounded-md border border-gray-300 px-2 py-1" />
        </div>
      ))}
      <div className="grid grid-cols-3 gap-2">
        <input type="number" placeholder="Freight $" value={freight} onChange={(e) => setFreight(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input type="number" placeholder="Tax $" value={tax} onChange={(e) => setTax(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input type="number" placeholder="Invoice total $" required value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Matching…" : "Record invoice"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
