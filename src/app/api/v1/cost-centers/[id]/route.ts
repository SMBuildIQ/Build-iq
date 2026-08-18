import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({ code: z.string().min(1).max(50), name: z.string().min(1).max(200) });

async function loadOwned(id: string, organizationId: string) {
  const costCenter = await prisma.costCenter.findFirst({ where: { id, organizationId } });
  if (!costCenter) throw new NotFoundError("Cost center not found");
  return costCenter;
}

export const PATCH = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_settings");
  const costCenter = await loadOwned(id, ctx.organizationId);

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("code and name are required");

  if (body.data.code !== costCenter.code) {
    const existing = await prisma.costCenter.findUnique({
      where: { organizationId_code: { organizationId: ctx.organizationId, code: body.data.code } },
    });
    if (existing) throw new ValidationError(`Cost center code "${body.data.code}" is already in use`);
  }

  const updated = await prisma.costCenter.update({ where: { id: costCenter.id }, data: body.data });
  await writeAuditLog(ctx, {
    action: "cost_center.update",
    entityType: "CostCenter",
    entityId: costCenter.id,
    before: { code: costCenter.code, name: costCenter.name },
    after: body.data,
  });
  return NextResponse.json({ costCenter: updated });
});

// Blocked (not cascaded) when purchase requests still reference this cost center —
// see the matching comment on departments/[id]/route.ts.
export const DELETE = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_settings");
  const costCenter = await loadOwned(id, ctx.organizationId);

  const usageCount = await prisma.purchaseRequest.count({ where: { costCenterId: costCenter.id } });
  if (usageCount > 0) {
    throw new ValidationError(`Cannot delete "${costCenter.code}" — it is used by ${usageCount} purchase request${usageCount === 1 ? "" : "s"}`);
  }

  await prisma.costCenter.delete({ where: { id: costCenter.id } });
  await writeAuditLog(ctx, { action: "cost_center.delete", entityType: "CostCenter", entityId: costCenter.id, before: { code: costCenter.code, name: costCenter.name } });
  return NextResponse.json({ ok: true });
});
