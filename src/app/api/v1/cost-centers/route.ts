import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ code: z.string().min(1).max(50), name: z.string().min(1).max(200) });

export const GET = withAuth(async (_req, ctx) => {
  const costCenters = await prisma.costCenter.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ costCenters });
});

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "org:manage_settings");
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("code and name are required");

  const existing = await prisma.costCenter.findUnique({
    where: { organizationId_code: { organizationId: ctx.organizationId, code: body.data.code } },
  });
  if (existing) throw new ValidationError(`Cost center code "${body.data.code}" is already in use`);

  const costCenter = await prisma.costCenter.create({
    data: { organizationId: ctx.organizationId, code: body.data.code, name: body.data.name },
  });
  await writeAuditLog(ctx, { action: "cost_center.create", entityType: "CostCenter", entityId: costCenter.id, after: body.data });
  return NextResponse.json({ costCenter }, { status: 201 });
});
