import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "purchase_order:view");
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      supplier: true,
      purchaseRequest: true,
      lineItems: { include: { receiptLineItems: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      receipts: { include: { lineItems: true } },
    },
  });
  if (!po) throw new NotFoundError("Purchase order not found");
  return NextResponse.json({ purchaseOrder: po });
});
