import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { scanBlueprint } from "@/lib/plans/scan";

type Ctx = { params: Promise<{ id: string; blueprintId: string }> };

/** Run OCR + drawing vision scan on one blueprint. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("estimate:run");
    const { id, blueprintId } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const project = await prisma.project.findFirst({
      where: { id, companyId: user.companyId },
      include: { blueprints: { where: { id: blueprintId } } },
    });
    if (!project || !project.blueprints[0]) {
      return NextResponse.json({ error: "Blueprint not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const result = await scanBlueprint(
      blueprintId,
      {
        projectName: project.name,
        squareFeet: project.squareFeet || 2200,
        stories: project.stories || 1,
        notes: project.notes,
      },
      {
        runOcr: body.runOcr !== false,
        runVision: body.runVision !== false,
      }
    );

    const blueprint = await prisma.blueprint.findUnique({
      where: { id: blueprintId },
      include: { measurements: true },
    });

    return NextResponse.json({ result, blueprint });
  } catch (error) {
    return jsonError(error);
  }
}
