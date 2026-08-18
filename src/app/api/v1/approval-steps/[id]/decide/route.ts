import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission, ForbiddenError } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  decision: z.enum(["approve", "reject", "request_changes"]),
  comments: z.string().optional().nullable(),
});

// brief §19: "Every approval must record: Approver, Date/time, Decision, Comments,
// Version being approved." Authorization here checks the *role* the policy engine
// required (step.requiredRoleKey), not just the generic approval:decide permission
// — a Department Manager cannot sign off a CFO-level step just because both roles
// carry approval:decide.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "approval:decide");

  const step = await prisma.approvalStep.findFirst({
    where: { id, approvalRequest: { purchaseRequest: { organizationId: ctx.organizationId } } },
    include: { approvalRequest: { include: { steps: true, purchaseRequest: true } } },
  });
  if (!step) throw new NotFoundError("Approval step not found");
  if (step.decidedAt) throw new ValidationError("This approval step has already been decided");
  // company_owner is the one role with standing override authority on every
  // approval tier (matches brief §2's "Company Owner" being the top of the
  // hierarchy); every other role must hold the exact role the policy engine
  // required for this step.
  if (!ctx.roleKeys.includes(step.requiredRoleKey) && !ctx.roleKeys.includes("company_owner")) {
    throw new ForbiddenError("approval:decide");
  }

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("Invalid input");

  await prisma.approvalStep.update({
    where: { id: step.id },
    data: {
      decision: body.data.decision,
      comments: body.data.comments ?? null,
      decidedByUserId: ctx.userId,
      decidedAt: new Date(),
      versionSnapshot: JSON.stringify({ purchaseRequestStatus: step.approvalRequest.purchaseRequest.status, amount: step.approvalRequest.amount }),
    },
  });

  const purchaseRequestId = step.approvalRequest.purchaseRequestId;
  let newPrStatus: string | null = null;
  let newApprovalStatus: string | null = null;

  if (body.data.decision === "reject") {
    newApprovalStatus = "rejected";
    newPrStatus = "rejected";
  } else if (body.data.decision === "request_changes") {
    newApprovalStatus = "changes_requested";
    newPrStatus = "under_review";
  } else {
    const otherSteps = step.approvalRequest.steps.filter((s) => s.id !== step.id);
    const allApproved = otherSteps.every((s) => s.decision === "approve");
    if (allApproved) {
      newApprovalStatus = "approved";
      newPrStatus = "approved";
    }
  }

  if (newApprovalStatus) {
    await prisma.approvalRequest.update({ where: { id: step.approvalRequestId }, data: { status: newApprovalStatus } });
  }
  if (newPrStatus) {
    await prisma.purchaseRequest.update({ where: { id: purchaseRequestId }, data: { status: newPrStatus } });
    await prisma.purchaseRequestStatusEvent.create({
      data: {
        purchaseRequestId,
        fromStatus: step.approvalRequest.purchaseRequest.status,
        toStatus: newPrStatus,
        actorId: ctx.userId,
        actorType: "user",
        note: `Approval step decided: ${body.data.decision}`,
      },
    });
  }

  await writeAuditLog(ctx, {
    action: "approval_step.decide",
    entityType: "ApprovalStep",
    entityId: step.id,
    after: { decision: body.data.decision, comments: body.data.comments },
  });

  return NextResponse.json({ ok: true, purchaseRequestStatus: newPrStatus });
});
