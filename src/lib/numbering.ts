import { prisma } from "@/lib/db";

type Counter = "prNumberSeq" | "rfqNumberSeq" | "poNumberSeq";
type Prefix = "prNumberPrefix" | "rfqNumberPrefix" | "poNumberPrefix";

async function nextNumber(organizationId: string, counter: Counter, prefixField: Prefix): Promise<string> {
  // Prisma's { increment: 1 } compiles to a single atomic UPDATE at the SQL level
  // under both providers, not a read-then-write — verified race-safe under real
  // concurrent PostgreSQL load, not just SQLite's serialized writers (see
  // ARCHITECTURE.md's "Numbering" section).
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
