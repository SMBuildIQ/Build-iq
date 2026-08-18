import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { AddSupplierForm } from "./add-supplier-form";

export default async function SuppliersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: ctx.organizationId },
    include: { contacts: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Suppliers</h1>
      </div>

      <div className="mb-6">
        <AddSupplierForm />
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No suppliers yet. RFQ sourcing (§9 in the brief) prioritizes this approved-supplier database before any
          external discovery.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">City</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Score</th>
                <th className="px-4 py-2">On-time</th>
                <th className="px-4 py-2">Response rate</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2">{s.city ?? "—"}</td>
                  <td className="px-4 py-2">{s.contacts[0]?.email ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{s.status}</span>
                  </td>
                  <td className="px-4 py-2">{s.performanceScore ?? "Unrated"}</td>
                  <td className="px-4 py-2">{s.onTimeDeliveryRate !== null ? `${Math.round(s.onTimeDeliveryRate * 100)}%` : "—"}</td>
                  <td className="px-4 py-2">{s.responseRate !== null ? `${Math.round(s.responseRate * 100)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
