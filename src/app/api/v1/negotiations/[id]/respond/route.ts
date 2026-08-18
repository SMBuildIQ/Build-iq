import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  decision: z.enum(["accepted", "declined", "countered"]),
  resultPrice: z.number().min(0).optional(),
  resultTerms: z.string().optional().nullable(),
});

// The missing half of the negotiation lifecycle (found while adding
// savings-tracking tests, documented in KNOWN_LIMITATIONS.md): a negotiation
// could be drafted and sent, but nothing let a buyer record what the supplier
// actually said back. "accepted"/"countered" both require a resultPrice — an
// acceptance without a price, or a counter without a counter-amount, isn't a
// real response, it's a status with no content. src/lib/savings.ts already
// reads Negotiation.resultPrice for an "accepted" status; this is what
// actually gets it there.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "negotiation:initiate");

  const negotiation = await prisma.negotiation.findFirst({
    where: { id, quote: { rfqSupplier: { rfq: { organizationId: ctx.organizationId } } } },
    include: { quote: { include: { supplier: true } } },
  });
  if (!negotiation) throw new NotFoundError("Negotiation not found");
  if (negotiation.status !== "sent") throw new ValidationError(`Cannot record a response for a negotiation that is ${negotiation.status}`);

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("Invalid input");
  const input = body.data;

  if ((input.decision === "accepted" || input.decision === "countered") && input.resultPrice === undefined) {
    throw new ValidationError(`resultPrice is required to record a negotiation as ${input.decision}`);
  }

  const updated = await prisma.negotiation.update({
    where: { id: negotiation.id },
    data: {
      status: input.decision,
      resultPrice: input.resultPrice ?? null,
      resultTerms: input.resultTerms ?? null,
      messages: {
        create: [
          {
            direction: "inbound",
            authorType: "supplier",
            body:
              input.decision === "accepted"
                ? `Supplier accepted at $${input.resultPrice!.toLocaleString()}${input.resultTerms ? `, ${input.resultTerms}` : ""}.`
                : input.decision === "declined"
                  ? "Supplier declined this request."
                  : `Supplier countered at $${input.resultPrice!.toLocaleString()}${input.resultTerms ? `, ${input.resultTerms}` : ""}.`,
          },
        ],
      },
    },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  await writeAuditLog(ctx, {
    action: "negotiation.response_recorded",
    entityType: "Negotiation",
    entityId: negotiation.id,
    after: { decision: input.decision, resultPrice: input.resultPrice, supplier: negotiation.quote.supplier.name },
  });

  return NextResponse.json({ negotiation: updated });
});
