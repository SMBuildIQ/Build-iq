import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";

// brief §17: the human clicks "Send Negotiation" — the AI never dispatches this
// on its own. This endpoint is the only place a Negotiation moves out of
// "proposed"; there is no autonomous path that reaches "sent" without this call
// having been made by an authenticated user with negotiation:initiate.
export const POST = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "negotiation:initiate");

  const negotiation = await prisma.negotiation.findFirst({
    where: { id, quote: { rfqSupplier: { rfq: { organizationId: ctx.organizationId } } } },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      quote: { include: { supplier: { include: { contacts: true } }, rfqSupplier: { include: { rfq: true } } } },
    },
  });
  if (!negotiation) throw new NotFoundError("Negotiation not found");
  if (negotiation.status !== "proposed") throw new ValidationError(`Negotiation is already ${negotiation.status}`);

  // The draft created by POST /quotes/:id/negotiate is the only outbound
  // message on a fresh negotiation — same message this endpoint actually
  // dispatches, never a re-generated one.
  const draftMessage = negotiation.messages.find((m) => m.direction === "outbound");
  const contact = negotiation.quote.supplier.contacts.find((c) => c.isPrimary) ?? negotiation.quote.supplier.contacts[0];
  const to = contact?.email;

  if (draftMessage) {
    const subject = `Regarding your quote for RFQ ${negotiation.quote.rfqSupplier.rfq.rfqNumber}`;
    if (to) {
      await sendEmail({ to, subject, text: draftMessage.body, logPrefix: "negotiation.send" });
    } else {
      // Same honesty tradeoff as RFQ send: no contact on file means no delivery
      // to fabricate — log instead of silently pretending to send.
      console.log(`[negotiation.send] (no contact on file) would email:\n${subject}\n${draftMessage.body}`);
    }
  }

  const updated = await prisma.negotiation.update({
    where: { id: negotiation.id },
    data: { status: "sent" },
  });

  await writeAuditLog(ctx, {
    action: "negotiation.sent",
    entityType: "Negotiation",
    entityId: negotiation.id,
    after: { supplier: negotiation.quote.supplier.name, requestedPrice: negotiation.requestedPrice, delivered: !!to },
  });

  return NextResponse.json({ negotiation: updated });
});
