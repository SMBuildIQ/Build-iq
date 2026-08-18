import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "rfq:view");

  const rfq = await prisma.rFQ.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: {
      purchaseRequest: true,
      lineItems: true,
      suppliers: {
        include: { supplier: true, messages: { orderBy: { createdAt: "asc" } }, quotes: { include: { lineItems: true } } },
      },
    },
  });
  if (!rfq) throw new NotFoundError("RFQ not found");

  return NextResponse.json({ rfq });
});
