import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";

export const GET = withAuth(async (req, ctx) => {
  requirePermission(ctx, "audit_log:view");
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") ?? undefined;

  const entries = await prisma.auditLog.findMany({
    where: { organizationId: ctx.organizationId, ...(entityType ? { entityType } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ entries });
});
