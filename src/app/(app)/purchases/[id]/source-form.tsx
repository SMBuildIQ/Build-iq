"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SupplierOption {
  id: string;
  name: string;
}

interface RankedSupplierOption {
  supplier: SupplierOption;
  matchedCategories: string[];
}

export function SourceForm({
  purchaseRequestId,
  suppliers,
}: {
  purchaseRequestId: string;
  suppliers: RankedSupplierOption[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [quoteDeadline, setQuoteDeadline] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      setError("Select at least one supplier");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/rfqs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        purchaseRequestId,
        supplierIds: selected,
        quoteDeadline: quoteDeadline ? new Date(quoteDeadline).toISOString() : undefined,
        specialInstructions: specialInstructions || undefined,
        responseInstructions: "Reply through the secure link included in this RFQ.",
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create RFQ");
      return;
    }
    const data = await res.json();
    router.push(`/rfqs/${data.rfq.id}`);
  }

  if (suppliers.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Add suppliers first — sourcing prioritizes your approved supplier database (brief §9).
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {suppliers.map(({ supplier: s, matchedCategories }) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
            {s.name}
            {matchedCategories.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                Matches: {matchedCategories.join(", ")}
              </span>
            )}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">Quote deadline</span>
        <input type="date" value={quoteDeadline} onChange={(e) => setQuoteDeadline(e.target.value)} className="w-48 rounded-md border border-gray-300 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">Special instructions</span>
        <textarea rows={2} value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? "Creating…" : "Create RFQ"}
      </button>
    </form>
  );
}
