import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { SourceForm } from "./source-form";
import { IssuePoButton } from "./issue-po-button";
import { DocumentAttachments } from "@/components/DocumentAttachments";
import { parseCategories, rankSuppliersByCategoryMatch } from "@/lib/supplierMatching";

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { id } = await params;

  // Scoped by organizationId — a purchase request belonging to another tenant
  // renders 404 here exactly as it does from the API (tests/tenant-isolation.test.ts
  // exercises this at the API layer; this page relies on the same query shape).
  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      lineItems: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      approvalRequests: { include: { steps: true } },
      rfqs: true,
      purchaseOrders: true,
      department: true,
      costCenter: true,
      deliveryLocation: true,
    },
  });
  if (!pr) notFound();

  const documents = await prisma.document.findMany({
    where: { organizationId: ctx.organizationId, entityType: "purchase_request", entityId: pr.id },
    orderBy: { createdAt: "desc" },
  });

  const selectedQuote =
    pr.status === "approved" && pr.purchaseOrders.length === 0
      ? await prisma.quote.findFirst({ where: { rfqSupplier: { rfq: { purchaseRequestId: pr.id } }, status: "selected" } })
      : null;

  const lineItemCategories = [...new Set(pr.lineItems.map((li) => li.category).filter((c): c is string => !!c))];

  const suppliers =
    pr.rfqs.length === 0
      ? rankSuppliersByCategoryMatch(
          (
            await prisma.supplier.findMany({
              where: { organizationId: ctx.organizationId, status: { in: ["active", "approved"] } },
              select: { id: true, name: true, categories: true },
              orderBy: { name: "asc" },
            })
          ).map((s) => ({ id: s.id, name: s.name, categories: parseCategories(s.categories) })),
          lineItemCategories
        )
      : [];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-gray-400">{pr.requestNumber}</div>
          <h1 className="text-xl font-semibold">{pr.title}</h1>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">{pr.status}</span>
      </div>

      {pr.originalDescription && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 text-xs font-medium text-gray-500">Original request (as written)</div>
          <p className="text-sm text-gray-700">{pr.originalDescription}</p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <Detail label="Budget" value={pr.budget ? `$${pr.budget.toLocaleString()}` : "—"} />
        <Detail
          label="Required delivery"
          value={pr.requiredDeliveryDate ? new Date(pr.requiredDeliveryDate).toLocaleDateString() : "—"}
        />
        <Detail label="Payment terms" value={pr.paymentTermsRequirement ?? "—"} />
        <Detail label="Department" value={pr.department?.name ?? "—"} />
        <Detail label="Cost center" value={pr.costCenter ? `${pr.costCenter.code} — ${pr.costCenter.name}` : "—"} />
        <Detail label="Ship to" value={pr.deliveryLocation?.name ?? "—"} />
      </div>

      <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-2 text-xs font-medium text-gray-500">Line items</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Manufacturer</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Target price</th>
            </tr>
          </thead>
          <tbody>
            {pr.lineItems.map((li) => (
              <tr key={li.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{li.description}</td>
                <td className="px-4 py-2">{li.manufacturer ?? "—"}</td>
                <td className="px-4 py-2">
                  {li.quantity} {li.unitOfMeasure}
                </td>
                <td className="px-4 py-2">{li.targetPrice ? `$${li.targetPrice.toLocaleString()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-6">
        <DocumentAttachments entityType="purchase_request" entityId={pr.id} documents={documents} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 text-xs font-medium text-gray-500">History</div>
        <ol className="flex flex-col gap-2 text-sm">
          {pr.statusHistory.map((ev) => (
            <li key={ev.id} className="flex justify-between">
              <span>
                {ev.fromStatus ? `${ev.fromStatus} → ${ev.toStatus}` : ev.toStatus}
                {ev.note ? ` — ${ev.note}` : ""}
              </span>
              <span className="text-gray-400">{new Date(ev.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </div>

      {pr.rfqs.length === 0 ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-gray-700">Select suppliers and send an RFQ</div>
          <SourceForm purchaseRequestId={pr.id} suppliers={suppliers} />
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-gray-700">RFQs</div>
          <ul className="flex flex-col gap-1 text-sm">
            {pr.rfqs.map((rfq) => (
              <li key={rfq.id}>
                <Link href={`/rfqs/${rfq.id}`} className="text-gray-900 underline">
                  {rfq.rfqNumber}
                </Link>{" "}
                <span className="text-gray-400">— {rfq.status}</span>
              </li>
            ))}
          </ul>
          {pr.status === "quotes_received" || pr.status === "under_review" ? (
            <Link href={`/purchases/${pr.id}/compare`} className="mt-3 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
              Compare quotes
            </Link>
          ) : null}
        </div>
      )}

      {selectedQuote && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm text-gray-500">Approved — ready to issue a purchase order.</div>
          <IssuePoButton purchaseRequestId={pr.id} quoteId={selectedQuote.id} />
        </div>
      )}

      {pr.purchaseOrders.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 text-sm font-medium text-gray-700">Purchase orders</div>
          <ul className="flex flex-col gap-1 text-sm">
            {pr.purchaseOrders.map((po) => (
              <li key={po.id}>
                <Link href={`/orders/${po.id}`} className="text-gray-900 underline">
                  {po.poNumber}
                </Link>{" "}
                <span className="text-gray-400">— {po.status}</span>
              </li>
            ))}
          </ul>
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
