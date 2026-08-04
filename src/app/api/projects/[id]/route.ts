import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError, requireUser } from "@/lib/auth";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        blueprints: { orderBy: { createdAt: "desc" } },
        materials: { orderBy: [{ trade: "asc" }, { name: "asc" }] },
        estimate: true,
        bidPackages: { orderBy: { trade: "asc" }, include: { materials: true } },
        spruceSyncs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  squareFeet: z.number().int().positive().nullable().optional(),
  stories: z.number().int().min(1).max(4).optional(),
  notes: z.string().nullable().optional(),
  status: z
    .enum(["DRAFT", "ANALYZING", "ESTIMATED", "BIDDING", "SYNCED", "ARCHIVED"])
    .optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);
    const body = updateSchema.parse(await req.json());

    const project = await prisma.project.update({
      where: { id },
      data: body,
    });
    return NextResponse.json({ project });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
