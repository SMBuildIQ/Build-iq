"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  issued: ["supplier_confirmed", "cancelled"],
  supplier_confirmed: ["processing", "cancelled"],
  processing: ["production", "ready_to_ship", "cancelled"],
  production: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "delayed", "cancelled"],
  shipped: ["partially_delivered", "delivered", "delayed"],
  delayed: ["shipped", "partially_delivered", "delivered"],
  partially_delivered: ["delivered"],
  delivered: ["closed"],
};

export function StatusActions({ purchaseOrderId, currentStatus }: { purchaseOrderId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const options = NEXT_STATUS_OPTIONS[currentStatus] ?? [];

  async function advance(status: string) {
    setLoading(status);
    await fetch(`/api/v1/purchase-orders/${purchaseOrderId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(null);
    router.refresh();
  }

  if (options.length === 0) return null;

  return (
    <div className="flex gap-2">
      {options.map((status) => (
        <button
          key={status}
          onClick={() => advance(status)}
          disabled={!!loading}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {loading === status ? "…" : `Mark ${status.replace(/_/g, " ")}`}
        </button>
      ))}
    </div>
  );
}

interface POLineItem {
  id: string;
  description: string;
  quantity: number;
}

export function ReceivingForm({ purchaseOrderId, lineItems }: { purchaseOrderId: string; lineItems: POLineItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [received, setReceived] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium">
        Record receiving
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/v1/purchase-orders/${purchaseOrderId}/receipts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lineItems: lineItems.map((li) => ({
          purchaseOrderLineItemId: li.id,
          quantityReceived: Number(received[li.id] ?? li.quantity),
          quantityMissing: Number(missing[li.id] ?? 0),
        })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not record receiving");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      {lineItems.map((li) => (
        <div key={li.id} className="flex items-center gap-3 text-sm">
          <span className="flex-1">
            {li.description} (ordered {li.quantity})
          </span>
          <input
            type="number"
            placeholder="Received"
            defaultValue={li.quantity}
            onChange={(e) => setReceived({ ...received, [li.id]: e.target.value })}
            className="w-24 rounded-md border border-gray-300 px-2 py-1"
          />
          <input
            type="number"
            placeholder="Missing"
            onChange={(e) => setMissing({ ...missing, [li.id]: e.target.value })}
            className="w-24 rounded-md border border-gray-300 px-2 py-1"
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {submitting ? "Saving…" : "Save receiving record"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium">
      Print / Save as PDF
    </button>
  );
}
