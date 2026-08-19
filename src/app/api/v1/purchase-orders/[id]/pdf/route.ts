import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { generatePurchaseOrderPdf } from "@/lib/documents/purchaseOrderPdf";

function formatAddress(parts: (string | null)[]): string | null {
  const joined = parts.filter(Boolean).join(", ");
  return joined || null;
}

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "purchase_order:view");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { supplier: true, organization: true, lineItems: true },
  });
  if (!po) throw new NotFoundError("Purchase order not found");

  const pdf = await generatePurchaseOrderPdf({
    poNumber: po.poNumber,
    status: po.status,
    organizationName: po.organization.name,
    supplierName: po.supplier.name,
    supplierAddress: formatAddress([po.supplier.addressLine1, po.supplier.city, po.supplier.state, po.supplier.postalCode, po.supplier.country]),
    billingAddress: po.billingAddress,
    shippingAddress: po.shippingAddress,
    paymentTerms: po.paymentTerms,
    requestedDeliveryDate: po.requestedDeliveryDate,
    createdAt: po.createdAt,
    lineItems: po.lineItems.map((li) => ({ description: li.description, sku: li.sku, quantity: li.quantity, unitPrice: li.unitPrice, total: li.total })),
    freight: po.freight,
    tax: po.tax,
    total: po.total,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${po.poNumber}.pdf"`,
      "content-length": String(pdf.length),
    },
  });
});
