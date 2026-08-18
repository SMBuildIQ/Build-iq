import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";
import { recomputeSupplierPerformance } from "@/lib/supplierPerformance";

// brief §21: order tracking timeline.
const TRANSITIONS: Record<string, string[]> = {
  issued: ["supplier_confirmed", "cancelled"],
  supplier_confirmed: ["processing", "cancelled"],
  processing: ["production", "ready_to_ship", "cancelled"],
  production: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "delayed", "cancelled"],
  shipped: ["partially_delivered", "delivered", "delayed"],
  delayed: ["shipped", "partially_delivered", "delivered"],
  partially_delivered: ["delivered"],
  delivered: ["closed"],
};

const schema = z.object({ status: z.string(), note: z.string().optional().nullable() });

export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "purchase_order:issue");

  const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!po) throw new NotFoundError("Purchase order not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("Invalid input");

  const allowed = TRANSITIONS[po.status] ?? [];
  if (!allowed.includes(body.data.status)) {
    throw new ValidationError(`Cannot transition from ${po.status} to ${body.data.status}`);
  }

  const updated = await prisma.purchaseOrder.update({ where: { id: po.id }, data: { status: body.data.status } });
  await prisma.purchaseOrderStatusEvent.create({
    data: { purchaseOrderId: po.id, fromStatus: po.status, toStatus: body.data.status, actorType: "user", note: body.data.note ?? null },
  });

  if (body.data.status === "delivered") {
    await prisma.purchaseRequest.updateMany({ where: { id: po.purchaseRequestId, status: "ordered" }, data: { status: "delivered" } });
    await recomputeSupplierPerformance(po.supplierId);
  } else if (body.data.status === "shipped") {
    await prisma.purchaseRequest.updateMany({ where: { id: po.purchaseRequestId, status: { in: ["po_issued"] } }, data: { status: "shipped" } });
  } else if (["supplier_confirmed", "processing", "production", "ready_to_ship"].includes(body.data.status)) {
    await prisma.purchaseRequest.updateMany({ where: { id: po.purchaseRequestId, status: "po_issued" }, data: { status: "ordered" } });
  }

  await writeAuditLog(ctx, {
    action: "purchase_order.status_change",
    entityType: "PurchaseOrder",
    entityId: po.id,
    before: { status: po.status },
    after: { status: body.data.status },
  });

  return NextResponse.json({ purchaseOrder: updated });
});
