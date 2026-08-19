import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/check";
import { prisma } from "@/lib/db";
import { PurchasingQueryForm } from "./query-form";

// brief §25/§30: was a PlannedModule stub ("Backed by PriceBenchmark and the
// full purchase history graph") — now a real natural-language query surface
// over that same purchase history graph (src/lib/ai/purchasingQuery.ts), plus
// the benchmark-history browser KNOWN_LIMITATIONS.md said didn't exist yet —
// previously the only exposure to PriceBenchmark was the derived
// above-threshold flag on the compare page and dashboard insights.
export default async function IntelligencePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "analytics:view")) redirect("/dashboard");

  const benchmarks = await prisma.priceBenchmark.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: [{ category: "asc" }, { manufacturer: "asc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Purchasing intelligence</h1>
        <p className="text-sm text-gray-500">Ask questions about your organization&apos;s real purchase history.</p>
      </div>
      <PurchasingQueryForm />

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 text-sm font-medium text-gray-700">Price benchmarks</div>
        {benchmarks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No benchmarks yet — recomputed automatically each time a purchase order is issued (180-day rolling window).
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Manufacturer</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Avg unit price</th>
                  <th className="px-3 py-2">Sample size</th>
                  <th className="px-3 py-2">Period</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{b.category.startsWith("mfr:") ? "—" : b.category}</td>
                    <td className="px-3 py-2">{b.manufacturer ?? "—"}</td>
                    <td className="px-3 py-2">{b.unitOfMeasure}</td>
                    <td className="px-3 py-2">${b.avgUnitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{b.sampleSize}</td>
                    <td className="px-3 py-2">
                      {b.periodStart.toLocaleDateString()} – {b.periodEnd.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
