import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { evaluatePurchasePolicy, createApprovalRequest } from "@/lib/policy/engine";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ quoteId: z.string() });

// This is the single choke point where a chosen quote turns into either an
// approval requirement or an approved purchase — brief §18: "The rules engine
// determines what actions are actually allowed," never the AI recommendation
// screen the user just looked at.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "quote:review");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("quoteId is required");

  const purchaseRequest = await prisma.purchaseRequest.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!purchaseRequest) throw new NotFoundError("Purchase request not found");

  const quote = await prisma.quote.findFirst({
    where: { id: body.data.quoteId, rfqSupplier: { rfq: { purchaseRequestId: id, organizationId: ctx.organizationId } } },
    include: { supplier: true, lineItems: true, negotiations: { orderBy: { createdAt: "desc" } } },
  });
  if (!quote || quote.totalLandedCost === null) throw new NotFoundError("Quote not found for this purchase request");

  const allQuotes = await prisma.quote.findMany({
    where: { rfqSupplier: { rfq: { purchaseRequestId: id } }, totalLandedCost: { not: null } },
  });
  const initialQuoteTotal = Math.min(...allQuotes.map((q) => q.totalLandedCost!));

  const acceptedNegotiation = quote.negotiations.find((n) => n.status === "accepted");
  const finalAmount = acceptedNegotiation?.resultPrice ?? quote.totalLandedCost;

  const evaluation = await evaluatePurchasePolicy({
    organizationId: ctx.organizationId,
    amount: finalAmount,
    hasSubstitution: quote.lineItems.some((li) => li.isSubstitution),
    isInternationalSupplier: !!quote.supplier.country && quote.supplier.country.toUpperCase() !== "US",
  });

  await prisma.$transaction(async (tx) => {
    await tx.quote.update({ where: { id: quote.id }, data: { status: "selected" } });
    await tx.savingsRecord.upsert({
      where: { purchaseRequestId: id },
      create: {
        organizationId: ctx.organizationId,
        purchaseRequestId: id,
        initialQuoteTotal,
        lowestQualifiedQuote: initialQuoteTotal,
        negotiatedQuoteTotal: acceptedNegotiation ? finalAmount : null,
        finalApprovedPrice: finalAmount,
        negotiatedSavings: acceptedNegotiation ? initialQuoteTotal - finalAmount : null,
      },
      update: {
        initialQuoteTotal,
        lowestQualifiedQuote: initialQuoteTotal,
        negotiatedQuoteTotal: acceptedNegotiation ? finalAmount : null,
        finalApprovedPrice: finalAmount,
        negotiatedSavings: acceptedNegotiation ? initialQuoteTotal - finalAmount : null,
      },
    });
    await tx.purchaseRequest.update({
      where: { id },
      data: { status: evaluation.requiredApprovals.length > 0 ? "awaiting_approval" : "approved" },
    });
    await tx.purchaseRequestStatusEvent.create({
      data: {
        purchaseRequestId: id,
        fromStatus: purchaseRequest.status,
        toStatus: evaluation.requiredApprovals.length > 0 ? "awaiting_approval" : "approved",
        actorId: ctx.userId,
        actorType: "user",
        note: `Selected quote from ${quote.supplier.name}`,
      },
    });
  });

  if (evaluation.requiredApprovals.length > 0) {
    await createApprovalRequest({
      organizationId: ctx.organizationId,
      purchaseRequestId: id,
      amount: finalAmount,
      evaluation,
    });
  }

  await writeAuditLog(ctx, {
    action: "purchase_request.select_quote",
    entityType: "PurchaseRequest",
    entityId: id,
    after: { quoteId: quote.id, finalAmount, requiredApprovals: evaluation.requiredApprovals.map((a) => a.roleKey) },
  });

  return NextResponse.json({ ok: true, requiredApprovals: evaluation.requiredApprovals, finalAmount });
});
