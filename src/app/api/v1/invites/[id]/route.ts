import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

export const DELETE = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_users");

  const invite = await prisma.invite.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!invite) throw new NotFoundError("Invite not found");

  await prisma.invite.update({ where: { id: invite.id }, data: { status: "revoked" } });
  await writeAuditLog(ctx, { action: "invite.revoke", entityType: "Invite", entityId: invite.id });

  return NextResponse.json({ ok: true });
});
