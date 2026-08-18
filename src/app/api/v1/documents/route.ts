import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError, NotFoundError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { DOCUMENT_ENTITY_TYPES, verifyEntityOwnership, type DocumentEntityType } from "@/lib/documents/entityOwnership";
import { saveUploadedFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/lib/documents/storage";
import { writeAuditLog } from "@/lib/audit";

// Documents attach to another already-permissioned entity (purchase request,
// RFQ, quote, PO, receipt, invoice, supplier), so upload/view reuse that
// entity's permission rather than inventing a separate "document:*" grant —
// brief §13/§26 treat documents as part of the record they support, not a
// standalone module.
const ENTITY_VIEW_PERMISSION: Record<DocumentEntityType, Parameters<typeof requirePermission>[1]> = {
  purchase_request: "purchase_request:view",
  rfq: "rfq:view",
  quote: "quote:review",
  purchase_order: "purchase_order:view",
  receipt: "purchase_order:view",
  invoice: "invoice:manage",
  supplier: "supplier:view",
};

export const GET = withAuth(async (req, ctx) => {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") as DocumentEntityType | null;
  const entityId = searchParams.get("entityId");
  if (!entityType || !entityId || !DOCUMENT_ENTITY_TYPES.includes(entityType)) {
    throw new ValidationError("entityType and entityId are required");
  }
  requirePermission(ctx, ENTITY_VIEW_PERMISSION[entityType]);

  const owned = await verifyEntityOwnership(ctx.organizationId, entityType, entityId);
  if (!owned) throw new NotFoundError("Entity not found");

  const documents = await prisma.document.findMany({
    where: { organizationId: ctx.organizationId, entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
});

export const POST = withAuth(async (req, ctx) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw new ValidationError("Expected multipart/form-data");

  const entityType = form.get("entityType") as DocumentEntityType | null;
  const entityId = form.get("entityId") as string | null;
  const file = form.get("file");

  if (!entityType || !entityId || !DOCUMENT_ENTITY_TYPES.includes(entityType)) {
    throw new ValidationError("entityType and entityId are required");
  }
  if (!(file instanceof File)) {
    throw new ValidationError("file is required");
  }

  requirePermission(ctx, ENTITY_VIEW_PERMISSION[entityType]);

  const owned = await verifyEntityOwnership(ctx.organizationId, entityType, entityId);
  if (!owned) throw new NotFoundError("Entity not found");

  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError(`File must be between 1 byte and ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`);
  }
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ValidationError(`Unsupported file type: ${mimeType}`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const storageKey = await saveUploadedFile(ctx.organizationId, file.name, bytes);

  const document = await prisma.document.create({
    data: {
      organizationId: ctx.organizationId,
      entityType,
      entityId,
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      storageKey,
      uploadedByUserId: ctx.userId,
      // Honest status: no AV integration is wired up. See KNOWN_LIMITATIONS.md.
      virusScanStatus: "skipped",
    },
  });

  await writeAuditLog(ctx, {
    action: "document.upload",
    entityType: "Document",
    entityId: document.id,
    after: { filename: file.name, attachedTo: `${entityType}:${entityId}` },
  });

  return NextResponse.json({ document }, { status: 201 });
});
