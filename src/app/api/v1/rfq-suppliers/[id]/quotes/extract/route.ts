import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { readUploadedFile } from "@/lib/documents/storage";
import { extractQuoteFromDocument } from "@/lib/ai/quoteDocumentExtraction";

const schema = z.object({ documentId: z.string() });

// brief §13: extraction is a *preview* step only — nothing is persisted as a
// Quote here. The buyer reviews/corrects the extracted values (prefilled into
// the same form as manual entry) and only POST /rfq-suppliers/:id/quotes
// actually creates the Quote, which is also where the human-verification
// record (QuoteExtractionField) gets written — matching brief §13's "low
// confidence values should require human verification" rather than trusting
// this endpoint's output directly.
export const POST = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "rfq:create");

  const rfqSupplier = await prisma.rFQSupplier.findFirst({
    where: { id, rfq: { organizationId: ctx.organizationId } },
    include: { rfq: { include: { lineItems: true } } },
  });
  if (!rfqSupplier) throw new NotFoundError("RFQ supplier not found");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("documentId is required");

  const document = await prisma.document.findFirst({
    where: { id: body.data.documentId, organizationId: ctx.organizationId, entityType: "rfq_supplier", entityId: id },
  });
  if (!document) throw new NotFoundError("Document not found for this RFQ supplier");

  const bytes = await readUploadedFile(document.storageKey);
  const result = await extractQuoteFromDocument({
    organizationId: ctx.organizationId,
    documentId: document.id,
    mimeType: document.mimeType,
    base64: bytes.toString("base64"),
  });

  // Best-effort positional mapping onto this RFQ's actual line items — quotes
  // typically list items in the same order they were requested. When counts
  // don't align the extra/missing ones are left for the buyer to fix by hand;
  // this never guesses which RFQ line item an extraction "meant."
  const rfqLineItems = rfqSupplier.rfq.lineItems;
  const mappedLineItems = result.fields?.lineItems.map((li, index) => ({
    ...li,
    rfqLineItemId: rfqLineItems[index]?.id ?? null,
  }));

  return NextResponse.json({
    available: result.available,
    reason: result.reason,
    fields: result.fields ? { ...result.fields, lineItems: mappedLineItems } : null,
    aiActivityLogId: result.aiActivityLogId,
    documentId: document.id,
  });
});
