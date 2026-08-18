import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { enqueueJob, processJobById } from "@/lib/jobs/queue";
import "@/lib/jobs/processors/rfqSend"; // registers the "rfq.send" processor
import { writeAuditLog } from "@/lib/audit";

export const POST = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "rfq:create");

  const rfq = await prisma.rFQ.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!rfq) throw new NotFoundError("RFQ not found");
  if (rfq.status !== "draft") throw new ValidationError(`RFQ is already ${rfq.status}`);

  const jobId = await enqueueJob("rfq.send", { rfqId: rfq.id }, ctx.organizationId);
  // Process inline so the send is visible immediately in dev/demo; scripts/worker.ts
  // is the production execution path and processes the same queued row if this
  // inline call doesn't run first (e.g. serverless cold start racing the request).
  await processJobById(jobId);

  await prisma.purchaseRequest.update({ where: { id: rfq.purchaseRequestId }, data: { status: "rfq_active" } });
  await writeAuditLog(ctx, { action: "rfq.send_requested", entityType: "RFQ", entityId: rfq.id });

  const updated = await prisma.rFQ.findUniqueOrThrow({
    where: { id: rfq.id },
    include: { suppliers: { include: { supplier: true } } },
  });
  return NextResponse.json({ rfq: updated });
});
