import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/check";

// brief §23: invoice three-way matching had a real matching engine and a
// per-PO view, but no org-wide list — a buyer chasing discrepancies had to
// already know which PO to look at. This is that list, real data only.
export default async function InvoicesPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "invoice:manage")) redirect("/dashboard");

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: ctx.organizationId },
    include: { purchaseOrder: { include: { supplier: true } }, matchExceptions: true },
    orderBy: { receivedAt: "desc" },
    take: 200,
  });

  if (invoices.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-xl font-semibold">Invoices</h1>
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No invoices recorded yet. Record one from a purchase order&apos;s detail page once a supplier bills you.
        </div>
      </div>
    );
  }

  const discrepancyCount = invoices.filter((inv) => inv.status === "discrepancy").length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
        {discrepancyCount > 0 && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            {discrepancyCount} with discrepancies
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Invoice #</th>
              <th className="px-4 py-2">Purchase order</th>
              <th className="px-4 py-2">Supplier</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Received</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{inv.supplierInvoiceNumber ?? "—"}</td>
                <td className="px-4 py-2">
                  {inv.purchaseOrder ? (
                    <Link href={`/orders/${inv.purchaseOrder.id}`} className="text-gray-900 underline">
                      {inv.purchaseOrder.poNumber}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2">{inv.purchaseOrder?.supplier.name ?? "—"}</td>
                <td className="px-4 py-2">${inv.amount.toLocaleString()}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(inv.receivedAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.status === "matched"
                        ? "bg-green-100 text-green-700"
                        : inv.status === "discrepancy"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {inv.status === "discrepancy" ? `${inv.matchExceptions.length} discrepancy(s)` : inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
