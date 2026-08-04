import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { buildEstimatePdf } from "@/lib/export/pdf";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("project:read");
    const { id } = await ctx.params;
    await ensureOwnedProject(id, user.companyId);

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        materials: true,
        estimate: true,
        bidPackages: true,
        company: { select: { name: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const buffer = await buildEstimatePdf({
      project,
      materials: project.materials,
      estimate: project.estimate,
      bidPackages: project.bidPackages,
    });

    const filename = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-estimate-subtotals.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
