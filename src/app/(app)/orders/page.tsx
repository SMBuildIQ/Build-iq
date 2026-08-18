import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export default async function OrdersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const orders = await prisma.purchaseOrder.findMany({
    where: { organizationId: ctx.organizationId },
    include: { supplier: true, purchaseRequest: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold">Orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No purchase orders yet. Orders are issued from an approved purchase request.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">PO #</th>
                <th className="px-4 py-2">Purchase request</th>
                <th className="px-4 py-2">Supplier</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/orders/${po.id}`} className="font-medium text-gray-900 underline">
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{po.purchaseRequest.title}</td>
                  <td className="px-4 py-2">{po.supplier.name}</td>
                  <td className="px-4 py-2">{po.total ? `$${po.total.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{po.status}</span>
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
