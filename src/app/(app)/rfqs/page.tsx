import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";

export default async function RfqsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const rfqs = await prisma.rFQ.findMany({
    where: { organizationId: ctx.organizationId },
    include: { suppliers: true, purchaseRequest: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-xl font-semibold">RFQs</h1>
      {rfqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No RFQs yet. Create one from a purchase request.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">RFQ #</th>
                <th className="px-4 py-2">Purchase request</th>
                <th className="px-4 py-2">Suppliers</th>
                <th className="px-4 py-2">Responses</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq) => (
                <tr key={rfq.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/rfqs/${rfq.id}`} className="font-medium text-gray-900 underline">
                      {rfq.rfqNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{rfq.purchaseRequest.title}</td>
                  <td className="px-4 py-2">{rfq.suppliers.length}</td>
                  <td className="px-4 py-2">{rfq.suppliers.filter((s) => s.status === "responded").length}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{rfq.status}</span>
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
