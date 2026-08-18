import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { StatusActions, ReceivingForm, PrintButton } from "./order-actions";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      supplier: true,
      purchaseRequest: true,
      lineItems: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      receipts: { include: { lineItems: true } },
    },
  });
  if (!po) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-gray-400">{po.poNumber}</div>
          <h1 className="text-xl font-semibold">Purchase order — {po.supplier.name}</h1>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium print:hidden">{po.status}</span>
      </div>

      <div className="mb-6 flex gap-2 print:hidden">
        <StatusActions purchaseOrderId={po.id} currentStatus={po.status} />
        <PrintButton />
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Unit price</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {po.lineItems.map((li) => (
              <tr key={li.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{li.description}</td>
                <td className="px-4 py-2">{li.quantity}</td>
                <td className="px-4 py-2">${li.unitPrice.toLocaleString()}</td>
                <td className="px-4 py-2">${li.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 font-medium">
              <td className="px-4 py-2" colSpan={3}>
                Freight / Tax / Total
              </td>
              <td className="px-4 py-2">
                ${po.freight?.toLocaleString() ?? 0} / ${po.tax?.toLocaleString() ?? 0} / ${po.total?.toLocaleString() ?? "—"}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
        <Detail label="Payment terms" value={po.paymentTerms ?? "—"} />
        <Detail label="Requested delivery" value={po.requestedDeliveryDate ? new Date(po.requestedDeliveryDate).toLocaleDateString() : "—"} />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 print:hidden">
        <div className="mb-2 text-sm font-medium text-gray-700">Timeline</div>
        <ol className="flex flex-col gap-1 text-sm">
          {po.statusHistory.map((ev) => (
            <li key={ev.id} className="flex justify-between">
              <span>{ev.fromStatus ? `${ev.fromStatus} → ${ev.toStatus}` : ev.toStatus}</span>
              <span className="text-gray-400">{new Date(ev.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </div>

      {["shipped", "partially_delivered", "delayed", "delivered"].includes(po.status) && po.receipts.length === 0 && (
        <div className="print:hidden">
          <ReceivingForm purchaseOrderId={po.id} lineItems={po.lineItems.map((li) => ({ id: li.id, description: li.description, quantity: li.quantity }))} />
        </div>
      )}

      {po.receipts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 print:hidden">
          <div className="mb-2 text-sm font-medium text-gray-700">Receiving</div>
          {po.receipts.map((r) => (
            <div key={r.id} className="text-sm text-gray-600">
              Received {r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : ""} —{" "}
              {r.lineItems.reduce((sum, li) => sum + li.quantityReceived, 0)} units,{" "}
              {r.lineItems.reduce((sum, li) => sum + li.quantityMissing, 0)} missing
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
