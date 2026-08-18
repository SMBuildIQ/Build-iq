import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { RecommendButton, SelectQuoteButton, NegotiateButton } from "./compare-actions";

export default async function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const pr = await prisma.purchaseRequest.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!pr) notFound();

  const quotes = await prisma.quote.findMany({
    where: { rfqSupplier: { rfq: { purchaseRequestId: id } } },
    include: { supplier: true, lineItems: true },
    orderBy: { totalLandedCost: "asc" },
  });

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
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-2 font-medium">{q.supplier.name}</td>
                  <td className="px-4 py-2">{q.productTotal ? `$${q.productTotal.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2">{q.freightIncluded ? "Included" : q.freight ? `$${q.freight.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2 font-medium">{q.totalLandedCost ? `$${q.totalLandedCost.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2">{q.leadTimeDays ? `${q.leadTimeDays} days` : "—"}</td>
                  <td className="px-4 py-2">{q.paymentTerms ?? "—"}</td>
                  <td className="px-4 py-2">{q.warranty ?? "—"}</td>
                  <td className="px-4 py-2">
                    {q.status === "selected" ? (
                      <span className="text-xs font-medium text-green-700">Selected</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <SelectQuoteButton purchaseRequestId={pr.id} quoteId={q.id} />
                        <NegotiateButton quoteId={q.id} />
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
