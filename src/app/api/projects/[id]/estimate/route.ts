import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError, requireUser } from "@/lib/auth";
import { calculateEstimate } from "@/lib/estimate/calculator";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  contingencyPct: z.number().min(0).max(0.5).optional(),
  overheadPct: z.number().min(0).max(0.5).optional(),
  profitPct: z.number().min(0).max(0.5).optional(),
  taxPct: z.number().min(0).max(0.2).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const body = schema.parse(await req.json().catch(() => ({})));
    const materials = await prisma.materialItem.findMany({ where: { projectId: id } });
    if (!materials.length) {
      return NextResponse.json(
        { error: "No materials found. Run AI analysis first." },
        { status: 400 }
      );
    }

    const totals = calculateEstimate(materials, body);
    const existing = await prisma.estimate.findUnique({ where: { projectId: id } });

    const estimate = existing
      ? await prisma.estimate.update({
          where: { projectId: id },
          data: { ...totals, version: existing.version + 1 },
        })
      : await prisma.estimate.create({
          data: { projectId: id, ...totals },
        });

    await prisma.project.update({
      where: { id },
      data: { status: "ESTIMATED" },
    });

    return NextResponse.json({ estimate });
  } catch (error) {
    return jsonError(error);
  }
}
