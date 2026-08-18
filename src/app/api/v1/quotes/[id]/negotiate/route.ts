import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { draftNegotiation } from "@/lib/ai/negotiation";
import { writeAuditLog } from "@/lib/audit";

export const POST = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "negotiation:initiate");

  const quote = await prisma.quote.findFirst({
    where: { id, rfqSupplier: { rfq: { organizationId: ctx.organizationId } } },
    include: { supplier: true, rfqSupplier: { include: { rfq: true } } },
  });
  if (!quote) throw new NotFoundError("Quote not found");
  if (quote.totalLandedCost === null) throw new ValidationError("Quote has no total landed cost yet");

  const siblingQuotes = await prisma.quote.findMany({
    where: { rfqSupplier: { rfqId: quote.rfqSupplier.rfqId }, totalLandedCost: { not: null } },
  });
  const lowestQualifiedTotal = Math.min(...siblingQuotes.map((q) => q.totalLandedCost!));

  const draft = await draftNegotiation({
    organizationId: ctx.organizationId,
    quoteId: quote.id,
    supplierName: quote.supplier.name,
    currentTotal: quote.totalLandedCost,
    lowestQualifiedTotal,
    freight: quote.freight,
    freightIncluded: quote.freightIncluded,
  });

  const existingRounds = await prisma.negotiation.count({ where: { quoteId: quote.id } });

  const negotiation = await prisma.negotiation.create({
    data: {
      quoteId: quote.id,
      status: "proposed",
      round: existingRounds + 1,
      aiRecommendation: JSON.stringify(draft),
      requestedPrice: draft.targetPrice,
      initiatedByUserId: ctx.userId,
      autonomous: false,
      messages: {
        create: [{ direction: "outbound", authorType: "ai", body: draft.message }],
      },
    },
    include: { messages: true },
  });

  await writeAuditLog(ctx, {
    action: "negotiation.drafted",
    entityType: "Negotiation",
    entityId: negotiation.id,
    after: { targetPrice: draft.targetPrice },
  });

  return NextResponse.json({ negotiation }, { status: 201 });
});
