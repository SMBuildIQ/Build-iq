import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1).max(300),
  status: z.enum(["active", "approved", "restricted", "inactive"]).default("active"),
  website: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  categories: z.array(z.string()).default([]),
  paymentTerms: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  contact: z
    .object({ name: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional() })
    .optional(),
});

export const GET = withAuth(async (req, ctx) => {
  requirePermission(ctx, "supplier:view");
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const suppliers = await prisma.supplier.findMany({
    where: { organizationId: ctx.organizationId, ...(status ? { status } : {}) },
    include: { contacts: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json({ suppliers });
});

export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "supplier:manage");

  const body = createSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));
  const input = body.data;

  const supplier = await prisma.supplier.create({
    data: {
      organizationId: ctx.organizationId,
      name: input.name,
      status: input.status,
      website: input.website ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      categories: JSON.stringify(input.categories),
      paymentTerms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      contacts: input.contact
        ? { create: [{ name: input.contact.name, email: input.contact.email, phone: input.contact.phone, isPrimary: true }] }
        : undefined,
    },
    include: { contacts: true },
  });

  await writeAuditLog(ctx, {
    action: "supplier.create",
    entityType: "Supplier",
    entityId: supplier.id,
    after: { name: input.name, status: input.status },
  });

  return NextResponse.json({ supplier }, { status: 201 });
});
