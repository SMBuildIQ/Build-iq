"use client";

import { useState } from "react";

interface PurchasingQueryLineItem {
  poNumber: string;
  purchaseOrderDate: string;
  supplierName: string;
  description: string;
  manufacturer: string | null;
  category: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PurchasingQueryResult {
  filter: { manufacturer: string | null; category: string | null; keyword: string | null; timeframe: string };
  lineItems: PurchasingQueryLineItem[];
  totalSpent: number;
  lineItemCount: number;
  avgUnitPrice: number | null;
  answer: string;
}

const EXAMPLES = ["What did we pay for Lenovo laptops last year?", "How much have we spent this quarter?", "What did we buy from our suppliers last month?"];

export function PurchasingQueryForm() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<PurchasingQueryResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/v1/intelligence/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not run that query");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <label className="text-xs font-medium text-gray-500">Ask a question about your purchasing history</label>
        <div className="flex gap-2">
          <input
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What did we pay for Lenovo laptops last year?"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? "Asking…" : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setQuestion(ex)}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-200"
            >
              {ex}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-800">{result.answer}</p>
          {result.lineItems.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">PO</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Supplier</th>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit price</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lineItems.map((li, i) => (
                    <tr key={`${li.poNumber}-${i}`} className="border-t border-gray-100">
                      <td className="px-3 py-2">{li.poNumber}</td>
                      <td className="px-3 py-2">{new Date(li.purchaseOrderDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{li.supplierName}</td>
                      <td className="px-3 py-2">{li.description}</td>
                      <td className="px-3 py-2">{li.quantity}</td>
                      <td className="px-3 py-2">${li.unitPrice.toLocaleString()}</td>
                      <td className="px-3 py-2">${li.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
