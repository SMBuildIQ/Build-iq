import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { writeAuditLog } from "@/lib/audit";
import { CABINETRY_STAGES } from "@/lib/cabinetry/defaults";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("cabinetry:view");
    const { id } = await ctx.params;
    const opportunity = await prisma.cabinetryOpportunity.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        customer: true,
        project: true,
        productLine: true,
      },
    });
    if (!opportunity) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    return NextResponse.json({ opportunity });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  stage: z.enum(CABINETRY_STAGES as unknown as [string, ...string[]]).optional(),
  notes: z.string().max(4000).optional().nullable(),
  productLineId: z.string().optional().nullable(),
  builderName: z.string().max(200).optional().nullable(),
  architectName: z.string().max(200).optional().nullable(),
  designerName: z.string().max(200).optional().nullable(),
  projectAddress: z.string().max(400).optional().nullable(),
  constructionType: z.enum(["NEW_CONSTRUCTION", "REMODEL"]).optional().nullable(),
  supplyScope: z.enum(["SUPPLY_ONLY", "SUPPLY_AND_INSTALL"]).optional().nullable(),
  taxStatus: z.string().max(80).optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("cabinetry:opportunity:write");
    const { id } = await ctx.params;
    const existing = await prisma.cabinetryOpportunity.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
    }
    const body = patchSchema.parse(await req.json());
    const opportunity = await prisma.cabinetryOpportunity.update({
      where: { id },
      data: {
        ...body,
        version: body.stage && body.stage !== existing.stage ? existing.version + 1 : undefined,
      },
      include: { customer: true, project: true, productLine: true },
    });
    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "cabinetry.opportunity.updated",
      entityType: "CabinetryOpportunity",
      entityId: id,
      detail: body.stage ? `stage → ${body.stage}` : undefined,
    });
    return NextResponse.json({ opportunity });
  } catch (error) {
    return jsonError(error);
  }
}
