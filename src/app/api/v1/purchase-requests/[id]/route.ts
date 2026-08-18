import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["needs_information", "ready_for_sourcing", "cancelled"],
  needs_information: ["ready_for_sourcing", "cancelled"],
  ready_for_sourcing: ["rfq_active", "cancelled"],
  rfq_active: ["quotes_received", "cancelled"],
  quotes_received: ["under_review", "cancelled"],
  under_review: ["negotiating", "awaiting_approval", "cancelled"],
  negotiating: ["awaiting_approval", "cancelled"],
  awaiting_approval: ["approved", "rejected"],
  approved: ["po_issued"],
  rejected: ["under_review", "cancelled"],
  po_issued: ["ordered", "cancelled"],
  ordered: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["closed"],
};

const patchSchema = z.object({
  status: z.string().optional(),
  note: z.string().optional(),
});

async function loadOwned(id: string, organizationId: string) {
  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, organizationId },
    include: {
      lineItems: true,
      comments: { orderBy: { createdAt: "asc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      rfqs: true,
      approvalRequests: { include: { steps: true } },
      purchaseOrders: true,
    },
  });
  // findFirst scoped by organizationId means a cross-tenant id simply doesn't
  // match — the caller gets 404, never 403 (no confirmation the id exists elsewhere).
  if (!pr) throw new NotFoundError("Purchase request not found");
  return pr;
}

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "purchase_request:view");
  const pr = await loadOwned(id, ctx.organizationId);
  return NextResponse.json({ purchaseRequest: pr });
});

export const PATCH = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "purchase_request:edit");
  const pr = await loadOwned(id, ctx.organizationId);

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("Invalid input");

  if (body.data.status) {
    const allowed = STATUS_TRANSITIONS[pr.status] ?? [];
    if (!allowed.includes(body.data.status)) {
      throw new ValidationError(`Cannot transition from ${pr.status} to ${body.data.status}`);
    }
  }

  const updated = await prisma.purchaseRequest.update({
    where: { id: pr.id },
    data: body.data.status ? { status: body.data.status } : {},
  });

  if (body.data.status) {
    await prisma.purchaseRequestStatusEvent.create({
      data: {
        purchaseRequestId: pr.id,
        fromStatus: pr.status,
        toStatus: body.data.status,
        actorId: ctx.userId,
        actorType: "user",
        note: body.data.note ?? null,
      },
    });
    await writeAuditLog(ctx, {
      action: "purchase_request.status_change",
      entityType: "PurchaseRequest",
      entityId: pr.id,
      before: { status: pr.status },
      after: { status: body.data.status },
    });
  }

  return NextResponse.json({ purchaseRequest: updated });
});
