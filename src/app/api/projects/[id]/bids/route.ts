import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("bid:manage");
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const bidPackages = await prisma.bidPackage.findMany({
      where: { projectId: id },
      include: { materials: true },
      orderBy: { trade: "asc" },
    });

    return NextResponse.json({ bidPackages });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  packageId: z.string(),
  status: z.enum(["DRAFT", "SENT", "AWARDED", "DECLINED"]).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  description: z.string().optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("bid:manage");
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);
    const body = patchSchema.parse(await req.json());

    const pkg = await prisma.bidPackage.findFirst({
      where: { id: body.packageId, projectId: id },
    });
    if (!pkg) return NextResponse.json({ error: "Bid package not found" }, { status: 404 });

    const updated = await prisma.bidPackage.update({
      where: { id: pkg.id },
      data: {
        status: body.status,
        description: body.description,
        dueDate: body.dueDate === undefined ? undefined : body.dueDate ? new Date(body.dueDate) : null,
      },
      include: { materials: true },
    });

    if (body.status === "SENT") {
      await prisma.project.update({ where: { id }, data: { status: "BIDDING" } });
    }

    return NextResponse.json({ bidPackage: updated });
  } catch (error) {
    return jsonError(error);
  }
}
