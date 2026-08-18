import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  deliveryDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
  lineItems: z
    .array(
      z.object({
        purchaseOrderLineItemId: z.string(),
        quantityReceived: z.number().min(0),
        quantityDamaged: z.number().min(0).default(0),
        quantityMissing: z.number().min(0).default(0),
      })
    )
    .min(1),
});

// brief §22: receiving creates the record three-way matching will later compare
// against the PO and the supplier invoice — see InvoiceMatchException.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "receiving:record");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lineItems: true },
  });
  if (!po) throw new NotFoundError("Purchase order not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));

  const validIds = new Set(po.lineItems.map((li) => li.id));
  if (body.data.lineItems.some((li) => !validIds.has(li.purchaseOrderLineItemId))) {
    throw new ValidationError("Line items must belong to this purchase order");
  }

  const receipt = await prisma.receipt.create({
    data: {
      purchaseOrderId: po.id,
      receivedByUserId: ctx.userId,
      deliveryDate: body.data.deliveryDate ? new Date(body.data.deliveryDate) : new Date(),
      notes: body.data.notes ?? null,
      lineItems: {
        create: body.data.lineItems.map((li) => ({
          purchaseOrderLineItemId: li.purchaseOrderLineItemId,
          quantityReceived: li.quantityReceived,
          quantityDamaged: li.quantityDamaged,
          quantityMissing: li.quantityMissing,
          isPartial: li.quantityMissing > 0,
        })),
      },
    },
    include: { lineItems: true },
  });

  const fullyReceived = body.data.lineItems.every((li) => li.quantityMissing === 0);
  if (fullyReceived) {
    await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: "delivered" } });
    await prisma.purchaseOrderStatusEvent.create({
      data: { purchaseOrderId: po.id, fromStatus: po.status, toStatus: "delivered", actorType: "user", note: "Recorded as fully received" },
    });
    await prisma.purchaseRequest.updateMany({ where: { id: po.purchaseRequestId }, data: { status: "delivered" } });
  }

  await writeAuditLog(ctx, {
    action: "receipt.record",
    entityType: "Receipt",
    entityId: receipt.id,
    after: { purchaseOrderId: po.id, fullyReceived },
  });

  return NextResponse.json({ receipt }, { status: 201 });
});
