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
  const [freight, setFreight] = useState("");
  const [tax, setTax] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium">
        Record invoice
      </button>
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
      })),
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
      <input placeholder="Supplier invoice #" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
      {lineItems.map((li) => (
        <div key={li.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1">{li.description}</span>
          <input type="number" placeholder="Qty" defaultValue={li.quantity} onChange={(e) => setQuantities({ ...quantities, [li.id]: e.target.value })} className="w-20 rounded-md border border-gray-300 px-2 py-1" />
          <input type="number" step="0.01" placeholder="Unit price" defaultValue={li.unitPrice} onChange={(e) => setPrices({ ...prices, [li.id]: e.target.value })} className="w-28 rounded-md border border-gray-300 px-2 py-1" />
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
