import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ name: z.string().min(1).max(200) });

export const GET = withAuth(async (_req, ctx) => {
  const departments = await prisma.department.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ departments });
});

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "org:manage_settings");
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("name is required");

  const department = await prisma.department.create({
    data: { organizationId: ctx.organizationId, name: body.data.name },
  });
  await writeAuditLog(ctx, { action: "department.create", entityType: "Department", entityId: department.id, after: { name: body.data.name } });
  return NextResponse.json({ department }, { status: 201 });
});
