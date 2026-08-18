import { prisma } from "@/lib/db";

type Counter = "prNumberSeq" | "rfqNumberSeq" | "poNumberSeq";
type Prefix = "prNumberPrefix" | "rfqNumberPrefix" | "poNumberPrefix";

async function nextNumber(organizationId: string, counter: Counter, prefixField: Prefix): Promise<string> {
  // SQLite serializes writers, so a single UPDATE...RETURNING-style read-after-write
  // inside a transaction is sufficient to avoid duplicate numbers; Postgres migration
  // should keep this as a single atomic UPDATE (see ARCHITECTURE.md).
  const updated = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.update({
      where: { id: organizationId },
      data: { [counter]: { increment: 1 } },
    });
    return org;
  });
  const seq = updated[counter] as number;
  const prefix = updated[prefixField] as string;
  return `${prefix}-${seq}`;
}

export const nextPurchaseRequestNumber = (organizationId: string) =>
  nextNumber(organizationId, "prNumberSeq", "prNumberPrefix");
export const nextRfqNumber = (organizationId: string) =>
  nextNumber(organizationId, "rfqNumberSeq", "rfqNumberPrefix");
export const nextPoNumber = (organizationId: string) =>
  nextNumber(organizationId, "poNumberSeq", "poNumberPrefix");
