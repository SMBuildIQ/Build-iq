import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { generateQuoteRecommendation } from "@/lib/ai/quoteRecommendation";

export const POST = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "quote:review");

  const purchaseRequest = await prisma.purchaseRequest.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!purchaseRequest) throw new NotFoundError("Purchase request not found");

  const quotes = await prisma.quote.findMany({
    where: { rfqSupplier: { rfq: { purchaseRequestId: id } }, totalLandedCost: { not: null } },
    include: { supplier: true },
  });
  if (quotes.length === 0) throw new ValidationError("No quotes have been received yet");

  const recommendation = await generateQuoteRecommendation(
    ctx.organizationId,
    id,
    quotes.map((q) => ({
      quoteId: q.id,
      supplierName: q.supplier.name,
      totalLandedCost: q.totalLandedCost!,
      leadTimeDays: q.leadTimeDays,
      paymentTerms: q.paymentTerms,
      warranty: q.warranty,
      supplierPerformanceScore: q.supplier.performanceScore,
    }))
  );

  return NextResponse.json(recommendation);
});
