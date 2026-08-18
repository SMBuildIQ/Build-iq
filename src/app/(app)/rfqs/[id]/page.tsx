import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { SendRfqButton, ManualQuoteForm } from "./rfq-actions";

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const rfq = await prisma.rFQ.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      purchaseRequest: true,
      lineItems: true,
      suppliers: { include: { supplier: true, quotes: true } },
    },
  });
  if (!rfq) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-gray-400">{rfq.rfqNumber}</div>
          <h1 className="text-xl font-semibold">RFQ for {rfq.purchaseRequest.title}</h1>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">{rfq.status}</span>
      </div>

      {rfq.status === "draft" && (
        <div className="mb-6">
          <SendRfqButton rfqId={rfq.id} />
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-500">Line items</div>
        <table className="w-full text-left text-sm">
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

      <div className="flex flex-col gap-3">
        {rfq.suppliers.map((rs) => (
          <div key={rs.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{rs.supplier.name}</div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{rs.status}</span>
            </div>
            {appUrl && rs.status !== "pending" && (
              <p className="mt-1 truncate text-xs text-gray-400">
                Portal link: {appUrl}/portal/rfq/{rs.secureToken}
              </p>
            )}
            {rs.quotes.length > 0 ? (
              <p className="mt-2 text-sm text-gray-700">
                Quote received: ${rs.quotes[0].totalLandedCost?.toLocaleString() ?? "—"} total landed cost
              </p>
            ) : (
              rs.status !== "pending" &&
              rs.status !== "declined" && (
                <div className="mt-2">
                  <ManualQuoteForm
                    rfqSupplierId={rs.id}
                    lineItems={rfq.lineItems.map((li) => ({ id: li.id, description: li.description, quantity: li.quantity }))}
                  />
                </div>
              )
            )}
          </div>
        ))}
      </div>

      <Link href={`/purchases/${rfq.purchaseRequestId}/compare`} className="mt-6 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
        Compare quotes
      </Link>
    </div>
  );
}
