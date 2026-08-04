import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  companyId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
  ip?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: input.companyId || null,
        actorUserId: input.actorUserId || null,
        action: input.action,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        detail: input.detail || null,
        ip: input.ip || null,
      },
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}
