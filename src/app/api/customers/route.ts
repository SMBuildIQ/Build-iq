import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission, requireAnyPermission } from "@/lib/require-permission";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["BUILDER", "HOMEOWNER", "GC", "OTHER"]).optional(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(40).optional().nullable(),
  zip: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  try {
    const user = await requireAnyPermission("cabinetry:view", "proposal:view");
    const customers = await prisma.customer.findMany({
      where: { companyId: user.companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { contacts: true, opportunities: true, projects: true } } },
    });
    return NextResponse.json({ customers });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("cabinetry:opportunity:write");
    const body = createSchema.parse(await req.json());
    const customer = await prisma.customer.create({
      data: {
        companyId: user.companyId,
        name: body.name,
        type: body.type || "BUILDER",
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        notes: body.notes || null,
        createdById: user.id,
      },
    });
    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "customer.created",
      entityType: "Customer",
      entityId: customer.id,
      detail: customer.name,
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
