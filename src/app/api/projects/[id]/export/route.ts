import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError, requireUser } from "@/lib/auth";
import { buildEstimateWorkbook } from "@/lib/export/excel";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.id);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        materials: true,
        estimate: true,
        bidPackages: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const buffer = await buildEstimateWorkbook({
      project,
      materials: project.materials,
      estimate: project.estimate,
      bidPackages: project.bidPackages,
    });

    const filename = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-estimate.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
