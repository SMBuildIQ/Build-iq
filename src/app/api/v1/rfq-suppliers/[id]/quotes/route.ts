import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";
import { recomputeSupplierPerformance } from "@/lib/supplierPerformance";

const schema = z.object({
  lineItems: z
    .array(
      z.object({
        rfqLineItemId: z.string(),
        unitPrice: z.number().min(0),
        // Present only when this line item's price was pre-filled from AI
        // document extraction (brief §13) — recorded as a QuoteExtractionField
        // so the value stays traceable to its source document and confidence,
        // regardless of whether the buyer changed it before submitting.
        extractedUnitPrice: z.number().min(0).optional(),
        extractedConfidence: z.number().min(0).max(1).optional(),
      })
    )
    .min(1),
  freight: z.number().min(0).optional().nullable(),
  leadTimeDays: z.number().int().min(0).optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  sourceType: z.enum(["manual", "pdf", "excel", "csv", "email"]).default("manual"),
  extractionDocumentId: z.string().optional(),
});

// Buyer-entered quote for a supplier response received outside the portal (PDF,
// Excel, email, phone) — brief §13: quotes must be accepted from all of those
// channels, not only the self-service portal. Also the landing point for the
// AI document-extraction flow (POST .../quotes/extract only previews; this is
// where a Quote actually gets created).
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "rfq:create");

  const rfqSupplier = await prisma.rFQSupplier.findFirst({
    where: { id, rfq: { organizationId: ctx.organizationId } },
    include: { rfq: { include: { lineItems: true } } },
  });
  if (!rfqSupplier) throw new NotFoundError("RFQ supplier not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));
  const input = body.data;

  const validIds = new Set(rfqSupplier.rfq.lineItems.map((li) => li.id));
  if (input.lineItems.some((li) => !validIds.has(li.rfqLineItemId))) {
    throw new ValidationError("Line items must belong to this RFQ");
  }
  if (input.extractionDocumentId) {
    const doc = await prisma.document.findFirst({
      where: { id: input.extractionDocumentId, organizationId: ctx.organizationId, entityType: "rfq_supplier", entityId: id },
    });
    if (!doc) throw new ValidationError("extractionDocumentId not found for this RFQ supplier");
  }

  let productTotal = 0;
  const quote = await prisma.quote.create({
    data: {
      rfqSupplierId: rfqSupplier.id,
      supplierId: rfqSupplier.supplierId,
      status: "received",
      freight: input.freight ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      paymentTerms: input.paymentTerms ?? null,
      sourceType: input.sourceType,
      lineItems: {
        create: input.lineItems.map((li) => {
          const rfqLineItem = rfqSupplier.rfq.lineItems.find((r) => r.id === li.rfqLineItemId)!;
          const extendedPrice = rfqLineItem.quantity * li.unitPrice;
          productTotal += extendedPrice;
          return {
            rfqLineItemId: li.rfqLineItemId,
            description: rfqLineItem.description,
            quantity: rfqLineItem.quantity,
            unitPrice: li.unitPrice,
            extendedPrice,
          };
        }),
      },
    },
    include: { lineItems: true },
  });

  const totalLandedCost = productTotal + (input.freight ?? 0);
  await prisma.quote.update({ where: { id: quote.id }, data: { productTotal, totalLandedCost } });
  await prisma.rFQSupplier.update({ where: { id: rfqSupplier.id }, data: { status: "responded", respondedAt: new Date() } });
  await prisma.purchaseRequest.updateMany({
    where: { id: rfqSupplier.rfq.purchaseRequestId, status: "rfq_active" },
    data: { status: "quotes_received" },
  });

  if (input.extractionDocumentId) {
    const extractedItems = input.lineItems.filter((li) => li.extractedUnitPrice !== undefined);
    if (extractedItems.length > 0) {
      await prisma.quoteExtractionField.createMany({
        data: extractedItems.map((li) => {
          const quoteLineItem = quote.lineItems.find((q) => q.rfqLineItemId === li.rfqLineItemId)!;
          return {
            quoteId: quote.id,
            documentId: input.extractionDocumentId!,
            fieldPath: `lineItems[${quoteLineItem.id}].unitPrice`,
            extractedValue: String(li.extractedUnitPrice),
            confidence: li.extractedConfidence ?? 0.5,
            // The buyer reviewing and submitting this form *is* the human
            // verification step brief §13 requires for low-confidence values.
            verifiedByUserId: ctx.userId,
            verifiedAt: new Date(),
          };
        }),
      });
    }
  }

  await writeAuditLog(ctx, {
    action: "quote.manual_entry",
    entityType: "Quote",
    entityId: quote.id,
    after: { sourceType: input.sourceType, productTotal, totalLandedCost, extractionDocumentId: input.extractionDocumentId },
  });
  await recomputeSupplierPerformance(rfqSupplier.supplierId);

  // The `quote` object above predates the productTotal/totalLandedCost update
  // a few lines up — re-fetch so the response reflects what was actually
  // persisted rather than the pre-update snapshot.
  const result = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id }, include: { lineItems: true } });
  return NextResponse.json({ quote: result }, { status: 201 });
});
