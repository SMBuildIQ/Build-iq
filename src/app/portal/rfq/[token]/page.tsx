import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PortalQuoteForm } from "./portal-quote-form";

// brief §12: "Suppliers should not need a full paid account." Access is via the
// unguessable secureToken on RFQSupplier — no session, no membership check. This
// is intentionally the one place in the app that reads by a bare token instead of
// an authenticated tenant context; it is safe only because the token is a 24-byte
// random value never exposed in a listing.
export default async function SupplierPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const rfqSupplier = await prisma.rFQSupplier.findUnique({
    where: { secureToken: token },
    include: {
      supplier: true,
      quotes: { orderBy: { createdAt: "desc" }, take: 1 },
      rfq: {
        include: {
          lineItems: true,
          organization: true,
        },
      },
    },
  });
  if (!rfqSupplier) notFound();

  const { rfq } = rfqSupplier;
  const existingQuote = rfqSupplier.quotes[0] ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <div className="text-xs font-medium text-gray-400">{rfq.rfqNumber}</div>
        <h1 className="text-xl font-semibold">Request for Quote from {rfq.organization.name}</h1>
        <p className="text-sm text-gray-500">Supplier: {rfqSupplier.supplier.name}</p>
      </div>

      {rfqSupplier.status === "declined" && (
        <div className="mb-6 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          You have declined this RFQ.
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {rfq.lineItems.map((li) => (
              <tr key={li.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{li.description}</td>
                <td className="px-4 py-2">
                  {li.quantity} {li.unitOfMeasure}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rfq.quoteDeadline && (
        <p className="mb-4 text-sm text-gray-500">Quote deadline: {new Date(rfq.quoteDeadline).toLocaleDateString()}</p>
      )}
      {rfq.specialInstructions && <p className="mb-4 text-sm text-gray-700">{rfq.specialInstructions}</p>}

      <PortalQuoteForm
        token={token}
        lineItems={rfq.lineItems.map((li) => ({ id: li.id, description: li.description, quantity: li.quantity }))}
        existingQuote={
          existingQuote
            ? { freight: existingQuote.freight, leadTimeDays: existingQuote.leadTimeDays, paymentTerms: existingQuote.paymentTerms }
            : null
        }
        declined={rfqSupplier.status === "declined"}
      />
    </main>
  );
}
