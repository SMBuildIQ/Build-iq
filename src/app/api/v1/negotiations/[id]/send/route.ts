import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

// brief §17: the human clicks "Send Negotiation" — the AI never dispatches this
// on its own. This endpoint is the only place a Negotiation moves out of
// "proposed"; there is no autonomous path that reaches "sent" without this call
// having been made by an authenticated user with negotiation:initiate.
export const POST = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "negotiation:initiate");

  const negotiation = await prisma.negotiation.findFirst({
    where: { id, quote: { rfqSupplier: { rfq: { organizationId: ctx.organizationId } } } },
    include: { quote: { include: { supplier: true } } },
  });
  if (!negotiation) throw new NotFoundError("Negotiation not found");
  if (negotiation.status !== "proposed") throw new ValidationError(`Negotiation is already ${negotiation.status}`);

  const updated = await prisma.negotiation.update({
    where: { id: negotiation.id },
    data: { status: "sent" },
  });

  await writeAuditLog(ctx, {
    action: "negotiation.sent",
    entityType: "Negotiation",
    entityId: negotiation.id,
    after: { supplier: negotiation.quote.supplier.name, requestedPrice: negotiation.requestedPrice },
  });

  return NextResponse.json({ negotiation: updated });
});
