import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  needs_information: "Needs Information",
  ready_for_sourcing: "Ready for Sourcing",
  rfq_active: "RFQ Active",
  quotes_received: "Quotes Received",
  under_review: "Under Review",
  negotiating: "Negotiating",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
  po_issued: "PO Issued",
  ordered: "Ordered",
  shipped: "Shipped",
  delivered: "Delivered",
  closed: "Closed",
  cancelled: "Cancelled",
};

export default async function PurchasesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const requests = await prisma.purchaseRequest.findMany({
    where: { organizationId: ctx.organizationId },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Purchases</h1>
        <Link href="/purchases/new" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Describe a purchase
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No purchase requests yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Request #</th>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Line items</th>
                <th className="px-4 py-2">Budget</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/purchases/${r.id}`} className="font-medium text-gray-900 underline">
                      {r.requestNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{r.title}</td>
                  <td className="px-4 py-2">{r.lineItems.length}</td>
                  <td className="px-4 py-2">{r.budget ? `$${r.budget.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
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
