import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(300),
  city: z.string().min(1).max(200),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(50).optional().nullable(),
  country: z.string().max(100).default("US"),
  isShipping: z.boolean().default(true),
  isBilling: z.boolean().default(false),
});

export const GET = withAuth(async (_req, ctx) => {
  const locations = await prisma.location.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ locations });
});

// brief §3: "The architecture should support multiple locations from day one."
export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "org:manage_settings");
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));

  const location = await prisma.location.create({
    data: { organizationId: ctx.organizationId, ...body.data },
  });
  await writeAuditLog(ctx, { action: "location.create", entityType: "Location", entityId: location.id, after: { name: body.data.name } });
  return NextResponse.json({ location }, { status: 201 });
});
