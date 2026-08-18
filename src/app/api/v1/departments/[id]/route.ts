import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({ name: z.string().min(1).max(200) });

async function loadOwned(id: string, organizationId: string) {
  const department = await prisma.department.findFirst({ where: { id, organizationId } });
  if (!department) throw new NotFoundError("Department not found");
  return department;
}

export const PATCH = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_settings");
  const department = await loadOwned(id, ctx.organizationId);

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("name is required");

  const updated = await prisma.department.update({ where: { id: department.id }, data: { name: body.data.name } });
  await writeAuditLog(ctx, {
    action: "department.update",
    entityType: "Department",
    entityId: department.id,
    before: { name: department.name },
    after: { name: body.data.name },
  });
  return NextResponse.json({ department: updated });
});

// Blocked (not cascaded) when purchase requests still reference this department —
// a hard delete here would silently orphan their departmentId, losing real
// cost-attribution history rather than actually removing an unused entry.
export const DELETE = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_settings");
  const department = await loadOwned(id, ctx.organizationId);

  const usageCount = await prisma.purchaseRequest.count({ where: { departmentId: department.id } });
  if (usageCount > 0) {
    throw new ValidationError(`Cannot delete "${department.name}" — it is used by ${usageCount} purchase request${usageCount === 1 ? "" : "s"}`);
  }

  await prisma.department.delete({ where: { id: department.id } });
  await writeAuditLog(ctx, { action: "department.delete", entityType: "Department", entityId: department.id, before: { name: department.name } });
  return NextResponse.json({ ok: true });
});
