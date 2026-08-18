import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { RecommendButton, SelectQuoteButton, NegotiateButton } from "./compare-actions";
import { benchmarkBucketKey, ABOVE_BENCHMARK_THRESHOLD } from "@/lib/priceBenchmark";

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const pr = await prisma.purchaseRequest.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!pr) notFound();

  const [quotes, benchmarks] = await Promise.all([
    prisma.quote.findMany({
      where: { rfqSupplier: { rfq: { purchaseRequestId: id } } },
      include: {
        supplier: true,
        lineItems: { include: { rfqLineItem: { include: { sourceLineItem: true } } } },
        // Most recent round only — the compare page shows current state, not
        // full negotiation history. Without this the page had no way to show
        // a negotiation actually happened at all once the browser reloaded;
        // NegotiateButton's "sent"/"draft" state was purely local React state.
        negotiations: { orderBy: { createdAt: "desc" }, take: 1, include: { messages: { orderBy: { createdAt: "asc" } } } },
      },
      orderBy: { totalLandedCost: "asc" },
    }),
    prisma.priceBenchmark.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { periodEnd: "desc" } }),
  ]);

  // brief §25: flag a quote priced meaningfully above what this org has
  // actually paid historically for the same manufacturer/category — only
  // when a real benchmark exists, never a guess.
  const latestBenchmarkByBucket = new Map<string, number>();
  for (const b of benchmarks) {
    const key = `${b.category}::${b.unitOfMeasure}`;
    if (!latestBenchmarkByBucket.has(key)) latestBenchmarkByBucket.set(key, b.avgUnitPrice);
  }
  const aboveBenchmark = new Map<string, boolean>();
  for (const q of quotes) {
    const flagged = q.lineItems.some((li) => {
      const source = li.rfqLineItem?.sourceLineItem;
      const bucketKey = benchmarkBucketKey(source?.manufacturer ?? null, source?.category ?? null);
      if (!bucketKey) return false;
      const avg = latestBenchmarkByBucket.get(`${bucketKey}::${source?.unitOfMeasure ?? "each"}`);
      return !!avg && avg > 0 && (li.unitPrice - avg) / avg > ABOVE_BENCHMARK_THRESHOLD;
    });
    aboveBenchmark.set(q.id, flagged);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold">Compare quotes</h1>
      <p className="mb-6 text-sm text-gray-500">{pr.title}</p>

      <RecommendButton purchaseRequestId={pr.id} />

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No quotes received yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Product total</th>
                <th className="px-4 py-2">Freight</th>
                <th className="px-4 py-2">Total landed cost</th>
                <th className="px-4 py-2">Lead time</th>
                <th className="px-4 py-2">Terms</th>
                <th className="px-4 py-2">Warranty</th>
                <th className="px-4 py-2">Supplier score</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 font-medium">{q.supplier.name}</td>
                  <td className="px-4 py-2">{q.productTotal ? `$${q.productTotal.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2">{q.freightIncluded ? "Included" : q.freight ? `$${q.freight.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2 font-medium">
                    {q.totalLandedCost ? `$${q.totalLandedCost.toLocaleString()}` : "—"}
                    {aboveBenchmark.get(q.id) && (
                      <div className="mt-0.5 text-[10px] font-normal text-amber-700">Above historical pricing</div>
                    )}
                  </td>
                  <td className="px-4 py-2">{q.leadTimeDays ? `${q.leadTimeDays} days` : "—"}</td>
                  <td className="px-4 py-2">{q.paymentTerms ?? "—"}</td>
                  <td className="px-4 py-2">{q.warranty ?? "—"}</td>
                  <td className="px-4 py-2">{q.supplier.performanceScore ?? "Unrated"}</td>
                  <td className="px-4 py-2">
                    {q.status === "selected" ? (
                      <span className="text-xs font-medium text-green-700">Selected</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <SelectQuoteButton purchaseRequestId={pr.id} quoteId={q.id} />
                        <NegotiateButton
                          quoteId={q.id}
                          latestNegotiation={
                            q.negotiations[0]
                              ? {
                                  id: q.negotiations[0].id,
                                  status: q.negotiations[0].status,
                                  resultPrice: q.negotiations[0].resultPrice,
                                  resultTerms: q.negotiations[0].resultTerms,
                                  messages: q.negotiations[0].messages.map((m) => ({ id: m.id, direction: m.direction, authorType: m.authorType, body: m.body })),
                                }
                              : null
                          }
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
