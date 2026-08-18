import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { nextPoNumber } from "@/lib/numbering";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ purchaseRequestId: z.string(), quoteId: z.string() });

export const GET = withAuth(async (_req, ctx) => {
  requirePermission(ctx, "purchase_order:view");
  const orders = await prisma.purchaseOrder.findMany({
    where: { organizationId: ctx.organizationId },
    include: { supplier: true, purchaseRequest: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ purchaseOrders: orders });
});

// brief §20: PO is generated only after approval. This is the second (and last)
// place, alongside select-quote, where money commits — both are gated by the
// policy engine having already run, never by this endpoint deciding on its own.
export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "purchase_order:issue");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("purchaseRequestId and quoteId are required");

  const purchaseRequest = await prisma.purchaseRequest.findFirst({
    where: { id: body.data.purchaseRequestId, organizationId: ctx.organizationId },
  });
  if (!purchaseRequest) throw new NotFoundError("Purchase request not found");
  if (purchaseRequest.status !== "approved") {
    throw new ValidationError(`Purchase request must be approved before a PO can be issued (currently ${purchaseRequest.status})`);
  }

  const quote = await prisma.quote.findFirst({
    where: {
      id: body.data.quoteId,
      status: "selected",
      rfqSupplier: { rfq: { purchaseRequestId: purchaseRequest.id, organizationId: ctx.organizationId } },
    },
    include: { lineItems: true, supplier: true },
  });
  if (!quote) throw new NotFoundError("Selected quote not found for this purchase request");

  const poNumber = await nextPoNumber(ctx.organizationId);

  const po = await prisma.purchaseOrder.create({
    data: {
      organizationId: ctx.organizationId,
      purchaseRequestId: purchaseRequest.id,
      supplierId: quote.supplierId,
      poNumber,
      status: "issued",
      paymentTerms: quote.paymentTerms,
      requestedDeliveryDate: purchaseRequest.requiredDeliveryDate,
      freight: quote.freight,
      tax: quote.taxes,
      total: quote.totalLandedCost,
      approvedByUserId: ctx.userId,
      lineItems: {
        create: quote.lineItems.map((li) => ({
          description: li.description,
          sku: li.sku,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          total: li.extendedPrice,
        })),
      },
      statusHistory: {
        create: [{ toStatus: "issued", actorType: "user", note: `Issued from quote ${quote.id}` }],
      },
    },
    include: { lineItems: true, supplier: true },
  });

  await prisma.purchaseRequest.update({ where: { id: purchaseRequest.id }, data: { status: "po_issued" } });
  await prisma.purchaseRequestStatusEvent.create({
    data: { purchaseRequestId: purchaseRequest.id, fromStatus: "approved", toStatus: "po_issued", actorId: ctx.userId, actorType: "user", note: `PO ${poNumber} issued` },
  });
  await prisma.savingsRecord.updateMany({ where: { purchaseRequestId: purchaseRequest.id }, data: { finalApprovedPrice: quote.totalLandedCost } });

  await writeAuditLog(ctx, {
    action: "purchase_order.issue",
    entityType: "PurchaseOrder",
    entityId: po.id,
    after: { poNumber, total: quote.totalLandedCost, supplier: quote.supplier.name },
  });

  return NextResponse.json({ purchaseOrder: po }, { status: 201 });
});
