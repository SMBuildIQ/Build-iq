import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError, NotFoundError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { nextRfqNumber } from "@/lib/numbering";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  purchaseRequestId: z.string(),
  supplierIds: z.array(z.string()).min(1),
  quoteDeadline: z.string().datetime().optional().nullable(),
  paymentTermsRequest: z.string().optional().nullable(),
  warrantyRequirement: z.string().optional().nullable(),
  substitutionRules: z.string().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  responseInstructions: z.string().optional().nullable(),
});

export const GET = withAuth(async (req, ctx) => {
  requirePermission(ctx, "rfq:view");
  const { searchParams } = new URL(req.url);
  const purchaseRequestId = searchParams.get("purchaseRequestId") ?? undefined;

  const rfqs = await prisma.rFQ.findMany({
    where: { organizationId: ctx.organizationId, ...(purchaseRequestId ? { purchaseRequestId } : {}) },
    include: { suppliers: { include: { supplier: true } }, lineItems: true, purchaseRequest: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ rfqs });
});

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "rfq:create");

  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));
  const input = body.data;

  const purchaseRequest = await prisma.purchaseRequest.findFirst({
    where: { id: input.purchaseRequestId, organizationId: ctx.organizationId },
    include: { lineItems: true },
  });
  if (!purchaseRequest) throw new NotFoundError("Purchase request not found");

  const suppliers = await prisma.supplier.findMany({
    where: { id: { in: input.supplierIds }, organizationId: ctx.organizationId },
  });
  if (suppliers.length !== input.supplierIds.length) {
    throw new ValidationError("One or more suppliers were not found in this organization");
  }

  const rfqNumber = await nextRfqNumber(ctx.organizationId);

  const rfq = await prisma.rFQ.create({
    data: {
      organizationId: ctx.organizationId,
      purchaseRequestId: purchaseRequest.id,
      rfqNumber,
      status: "draft",
      quoteDeadline: input.quoteDeadline ? new Date(input.quoteDeadline) : null,
      paymentTermsRequest: input.paymentTermsRequest ?? null,
      warrantyRequirement: input.warrantyRequirement ?? null,
      substitutionRules: input.substitutionRules ?? null,
      specialInstructions: input.specialInstructions ?? null,
      responseInstructions: input.responseInstructions ?? null,
      lineItems: {
        create: purchaseRequest.lineItems.map((li) => ({
          sourceLineItemId: li.id,
          description: li.description,
          quantity: li.quantity,
          unitOfMeasure: li.unitOfMeasure,
          specifications: li.specifications,
        })),
      },
      suppliers: {
        create: suppliers.map((s) => ({
          supplierId: s.id,
          secureToken: randomBytes(24).toString("hex"),
        })),
      },
    },
    include: { lineItems: true, suppliers: { include: { supplier: true } } },
  });

  await writeAuditLog(ctx, {
    action: "rfq.create",
    entityType: "RFQ",
    entityId: rfq.id,
    after: { rfqNumber, supplierCount: suppliers.length },
  });

  return NextResponse.json({ rfq }, { status: 201 });
});
