import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  lineItems: z.array(z.object({ rfqLineItemId: z.string(), unitPrice: z.number().min(0) })).min(1),
  freight: z.number().min(0).optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  sourceType: z.enum(["manual", "pdf", "excel", "csv", "email"]).default("manual"),
});

// Buyer-entered quote for a supplier response received outside the portal (PDF,
// Excel, email, phone) — brief §13: quotes must be accepted from all of those
// channels, not only the self-service portal.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "rfq:create");

  const rfqSupplier = await prisma.rFQSupplier.findFirst({
    where: { id, rfq: { organizationId: ctx.organizationId } },
    include: { rfq: { include: { lineItems: true } } },
  });
  if (!rfqSupplier) throw new NotFoundError("RFQ supplier not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));
  const input = body.data;

  const validIds = new Set(rfqSupplier.rfq.lineItems.map((li) => li.id));
  if (input.lineItems.some((li) => !validIds.has(li.rfqLineItemId))) {
    throw new ValidationError("Line items must belong to this RFQ");
  }

  let productTotal = 0;
  const quote = await prisma.quote.create({
    data: {
      rfqSupplierId: rfqSupplier.id,
      supplierId: rfqSupplier.supplierId,
      status: "received",
      freight: input.freight ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      paymentTerms: input.paymentTerms ?? null,
      sourceType: input.sourceType,
      lineItems: {
        create: input.lineItems.map((li) => {
          const rfqLineItem = rfqSupplier.rfq.lineItems.find((r) => r.id === li.rfqLineItemId)!;
          const extendedPrice = rfqLineItem.quantity * li.unitPrice;
          productTotal += extendedPrice;
          return {
            rfqLineItemId: li.rfqLineItemId,
            description: rfqLineItem.description,
            quantity: rfqLineItem.quantity,
            unitPrice: li.unitPrice,
            extendedPrice,
          };
        }),
      },
    },
    include: { lineItems: true },
  });

  const totalLandedCost = productTotal + (input.freight ?? 0);
  await prisma.quote.update({ where: { id: quote.id }, data: { productTotal, totalLandedCost } });
  await prisma.rFQSupplier.update({ where: { id: rfqSupplier.id }, data: { status: "responded", respondedAt: new Date() } });
  await prisma.purchaseRequest.updateMany({
    where: { id: rfqSupplier.rfq.purchaseRequestId, status: "rfq_active" },
    data: { status: "quotes_received" },
  });

  await writeAuditLog(ctx, {
    action: "quote.manual_entry",
    entityType: "Quote",
    entityId: quote.id,
    after: { sourceType: input.sourceType, productTotal, totalLandedCost },
  });

  return NextResponse.json({ quote }, { status: 201 });
});
