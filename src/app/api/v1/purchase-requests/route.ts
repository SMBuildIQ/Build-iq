import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { createPurchaseRequestSchema } from "@/lib/validation/purchaseRequest";
import { nextPurchaseRequestNumber } from "@/lib/numbering";
import { writeAuditLog } from "@/lib/audit";

export const GET = withAuth(async (req, ctx) => {
  requirePermission(ctx, "purchase_request:view");
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  // Tenant scoping: every list query in this codebase filters by ctx.organizationId,
  // never by a client-supplied org id. See tests/tenant-isolation.test.ts.
  const requests = await prisma.purchaseRequest.findMany({
    where: { organizationId: ctx.organizationId, ...(status ? { status } : {}) },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ purchaseRequests: requests });
});

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "purchase_request:create");

  const json = await req.json().catch(() => null);
  const parsed = createPurchaseRequestSchema.safeParse(json);
  if (!parsed.success) {
    throw new ValidationError(JSON.stringify(parsed.error.flatten()));
  }
  const input = parsed.data;

  const requestNumber = await nextPurchaseRequestNumber(ctx.organizationId);

  const purchaseRequest = await prisma.purchaseRequest.create({
    data: {
      organizationId: ctx.organizationId,
      requestNumber,
      requesterId: ctx.userId,
      title: input.title,
      status: "draft",
      budget: input.budget ?? null,
      requiredDeliveryDate: input.requiredDeliveryDate ? new Date(input.requiredDeliveryDate) : null,
      deliveryLocationId: input.deliveryLocationId ?? null,
      departmentId: input.departmentId ?? null,
      costCenterId: input.costCenterId ?? null,
      projectRef: input.projectRef ?? null,
      paymentTermsRequirement: input.paymentTermsRequirement ?? null,
      warrantyRequirement: input.warrantyRequirement ?? null,
      certificationRequirement: input.certificationRequirement ?? null,
      preferredSupplierIds: JSON.stringify(input.preferredSupplierIds),
      restrictedSupplierIds: JSON.stringify(input.restrictedSupplierIds),
      additionalInstructions: input.additionalInstructions ?? null,
      originalDescription: input.originalDescription ?? null,
      lineItems: {
        create: input.lineItems.map((li) => ({
          description: li.description,
          category: li.category ?? null,
          manufacturer: li.manufacturer ?? null,
          model: li.model ?? null,
          sku: li.sku ?? null,
          quantity: li.quantity,
          unitOfMeasure: li.unitOfMeasure,
          targetPrice: li.targetPrice ?? null,
          specifications: li.specifications ?? null,
          acceptableSubstitutions: JSON.stringify(li.acceptableSubstitutions),
          deliveryRequirement: li.deliveryRequirement ?? null,
        })),
      },
      statusHistory: {
        create: [{ toStatus: "draft", actorId: ctx.userId, actorType: "user", note: "Purchase request created" }],
      },
    },
    include: { lineItems: true },
  });

  await writeAuditLog(ctx, {
    action: "purchase_request.create",
    entityType: "PurchaseRequest",
    entityId: purchaseRequest.id,
    after: { requestNumber, title: input.title },
  });

  return NextResponse.json({ purchaseRequest }, { status: 201 });
});
