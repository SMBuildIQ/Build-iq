import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { readUploadedFile } from "@/lib/documents/storage";
import { extractInvoiceFromDocument } from "@/lib/ai/invoiceDocumentExtraction";

const schema = z.object({ documentId: z.string() });

// Preview step only, mirroring POST /rfq-suppliers/:id/quotes/extract — nothing
// is persisted as an Invoice here. The buyer reviews/corrects the extracted
// values (prefilled into the same form as manual entry) and only
// POST /purchase-orders/:id/invoices actually creates the Invoice, which is
// also where the human-verification record (InvoiceExtractionField) is written.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "invoice:manage");

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { lineItems: true },
  });
  if (!po) throw new NotFoundError("Purchase order not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("documentId is required");

  const document = await prisma.document.findFirst({
    where: { id: body.data.documentId, organizationId: ctx.organizationId, entityType: "purchase_order", entityId: id },
  });
  if (!document) throw new NotFoundError("Document not found for this purchase order");

  const bytes = await readUploadedFile(document.storageKey);
  const result = await extractInvoiceFromDocument({
    organizationId: ctx.organizationId,
    documentId: document.id,
    mimeType: document.mimeType,
    base64: bytes.toString("base64"),
  });

  // Best-effort positional mapping onto this PO's actual line items — an
  // invoice typically lists items in the same order as the PO it bills
  // against. When counts don't align the extra/missing ones are left for the
  // buyer to fix by hand; this never guesses which PO line item an
  // extraction "meant."
  const poLineItems = po.lineItems;
  const mappedLineItems = result.fields?.lineItems.map((li, index) => ({
    ...li,
    purchaseOrderLineItemId: poLineItems[index]?.id ?? null,
  }));

  return NextResponse.json({
    available: result.available,
    reason: result.reason,
    fields: result.fields ? { ...result.fields, lineItems: mappedLineItems } : null,
    aiActivityLogId: result.aiActivityLogId,
    documentId: document.id,
  });
});
