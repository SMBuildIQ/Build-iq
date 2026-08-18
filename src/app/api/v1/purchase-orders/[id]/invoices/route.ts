import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { runThreeWayMatch } from "@/lib/invoiceMatching";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  supplierInvoiceNumber: z.string().optional().nullable(),
  amount: z.number().min(0),
  freight: z.number().min(0).optional().nullable(),
  tax: z.number().min(0).optional().nullable(),
  lineItems: z
    .array(
      z.object({
        purchaseOrderLineItemId: z.string(),
        quantity: z.number().min(0),
        unitPrice: z.number().min(0),
        // Present only when this line item's price was pre-filled from AI
        // document extraction — recorded as an InvoiceExtractionField so the
        // value stays traceable to its source document and confidence,
        // regardless of whether the buyer changed it before submitting.
        extractedUnitPrice: z.number().min(0).optional(),
        extractedConfidence: z.number().min(0).max(1).optional(),
      })
    )
    .min(1),
  extractionDocumentId: z.string().optional(),
});

export const GET = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "invoice:manage");
  const po = await prisma.purchaseOrder.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!po) throw new NotFoundError("Purchase order not found");

  const invoices = await prisma.invoice.findMany({
    where: { purchaseOrderId: po.id },
    include: { lineItems: true, matchExceptions: true },
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json({ invoices });
});

export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "invoice:manage");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lineItems: true },
  });
  if (!po) throw new NotFoundError("Purchase order not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));
  const input = body.data;

  const validIds = new Set(po.lineItems.map((li) => li.id));
  if (input.lineItems.some((li) => !validIds.has(li.purchaseOrderLineItemId))) {
    throw new ValidationError("Line items must belong to this purchase order");
  }
  if (input.extractionDocumentId) {
    const doc = await prisma.document.findFirst({
      where: { id: input.extractionDocumentId, organizationId: ctx.organizationId, entityType: "purchase_order", entityId: id },
    });
    if (!doc) throw new ValidationError("extractionDocumentId not found for this purchase order");
  }

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: ctx.organizationId,
      purchaseOrderId: po.id,
      supplierInvoiceNumber: input.supplierInvoiceNumber ?? null,
      amount: input.amount,
      freight: input.freight ?? null,
      tax: input.tax ?? null,
      lineItems: {
        create: input.lineItems.map((li) => {
          const poLine = po.lineItems.find((l) => l.id === li.purchaseOrderLineItemId)!;
          return {
            purchaseOrderLineItemId: li.purchaseOrderLineItemId,
            description: poLine.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.quantity * li.unitPrice,
          };
        }),
      },
    },
    include: { lineItems: true },
  });

  if (input.extractionDocumentId) {
    const extractedItems = input.lineItems.filter((li) => li.extractedUnitPrice !== undefined);
    if (extractedItems.length > 0) {
      await prisma.invoiceExtractionField.createMany({
        data: extractedItems.map((li) => {
          const invoiceLineItem = invoice.lineItems.find((l) => l.purchaseOrderLineItemId === li.purchaseOrderLineItemId)!;
          return {
            invoiceId: invoice.id,
            documentId: input.extractionDocumentId!,
            fieldPath: `lineItems[${invoiceLineItem.id}].unitPrice`,
            extractedValue: String(li.extractedUnitPrice),
            confidence: li.extractedConfidence ?? 0.5,
            // The buyer reviewing and submitting this form *is* the human
            // verification step this extraction requires for low-confidence
            // values (same rule as quote extraction, brief §13).
            verifiedByUserId: ctx.userId,
            verifiedAt: new Date(),
          };
        }),
      });
    }
  }

  await runThreeWayMatch(invoice.id);

  // brief §24: realizedSavings = initial qualified quote minus the final invoice
  // amount — only ever set once an invoice actually exists, never estimated.
  const savings = await prisma.savingsRecord.findUnique({ where: { purchaseRequestId: po.purchaseRequestId } });
  if (savings?.initialQuoteTotal != null) {
    await prisma.savingsRecord.update({
      where: { purchaseRequestId: po.purchaseRequestId },
      data: {
        finalInvoiceAmount: input.amount,
        realizedSavings: savings.initialQuoteTotal - input.amount,
      },
    });
  }

  const result = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoice.id },
    include: { lineItems: true, matchExceptions: true },
  });

  await writeAuditLog(ctx, {
    action: "invoice.record",
    entityType: "Invoice",
    entityId: invoice.id,
    after: { amount: input.amount, status: result.status, exceptionCount: result.matchExceptions.length, extractionDocumentId: input.extractionDocumentId },
  });

  return NextResponse.json({ invoice: result }, { status: 201 });
});
