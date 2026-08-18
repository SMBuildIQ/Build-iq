import { prisma } from "@/lib/db";

export const DOCUMENT_ENTITY_TYPES = [
  "purchase_request",
  "rfq",
  "rfq_supplier",
  "quote",
  "purchase_order",
  "receipt",
  "invoice",
  "supplier",
] as const;

export type DocumentEntityType = (typeof DOCUMENT_ENTITY_TYPES)[number];

/**
 * Every document attaches to some other tenant-scoped entity. Before writing a
 * Document row we verify that entity actually belongs to the caller's
 * organization — otherwise a user could attach (and later read back) a file
 * pointed at another tenant's record by guessing its id. This is the same
 * "verify ownership, then act" pattern used by every other mutating route; see
 * tests/tenant-isolation.test.ts for the pattern it's checked against.
 */
export async function verifyEntityOwnership(
  organizationId: string,
  entityType: DocumentEntityType,
  entityId: string
): Promise<boolean> {
  switch (entityType) {
    case "purchase_request":
      return !!(await prisma.purchaseRequest.findFirst({ where: { id: entityId, organizationId } }));
    case "rfq":
      return !!(await prisma.rFQ.findFirst({ where: { id: entityId, organizationId } }));
    case "rfq_supplier":
      return !!(await prisma.rFQSupplier.findFirst({ where: { id: entityId, rfq: { organizationId } } }));
    case "quote":
      return !!(await prisma.quote.findFirst({ where: { id: entityId, rfqSupplier: { rfq: { organizationId } } } }));
    case "purchase_order":
      return !!(await prisma.purchaseOrder.findFirst({ where: { id: entityId, organizationId } }));
    case "receipt":
      return !!(await prisma.receipt.findFirst({ where: { id: entityId, purchaseOrder: { organizationId } } }));
    case "invoice":
      return !!(await prisma.invoice.findFirst({ where: { id: entityId, organizationId } }));
    case "supplier":
      return !!(await prisma.supplier.findFirst({ where: { id: entityId, organizationId } }));
    default:
      return false;
  }
}
