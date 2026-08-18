import { prisma } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/context";

interface AuditInput {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Every state-changing action funnels through here (brief §28: "The platform
 * needs to answer: Who did what, when, why, and based on what information?").
 * Never call prisma.auditLog.create directly from a route handler.
 */
export async function writeAuditLog(ctx: AuthContext, input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.userId,
      actorType: "user",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before !== undefined ? JSON.stringify(input.before) : null,
      after: input.after !== undefined ? JSON.stringify(input.after) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function writeSystemAuditLog(
  organizationId: string,
  actorType: "ai" | "system",
  input: Omit<AuditInput, "ipAddress" | "userAgent">
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: null,
      actorType,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before !== undefined ? JSON.stringify(input.before) : null,
      after: input.after !== undefined ? JSON.stringify(input.after) : null,
    },
  });
}
