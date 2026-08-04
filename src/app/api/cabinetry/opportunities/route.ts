import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { writeAuditLog } from "@/lib/audit";
import { ensureDefaultProductLines } from "@/lib/cabinetry/product-lines";
import { CABINETRY_STAGES } from "@/lib/cabinetry/defaults";

const createSchema = z.object({
  customerId: z.string().min(1).optional(),
  customerName: z.string().min(1).max(200).optional(),
  projectId: z.string().min(1).optional(),
  projectName: z.string().min(1).max(200).optional(),
  productLineId: z.string().optional().nullable(),
  productLineSlug: z.string().optional().nullable(),
  stage: z.enum(CABINETRY_STAGES as unknown as [string, ...string[]]).optional(),
  builderName: z.string().max(200).optional().nullable(),
  architectName: z.string().max(200).optional().nullable(),
  designerName: z.string().max(200).optional().nullable(),
  projectAddress: z.string().max(400).optional().nullable(),
  constructionType: z.enum(["NEW_CONSTRUCTION", "REMODEL"]).optional().nullable(),
  supplyScope: z.enum(["SUPPLY_ONLY", "SUPPLY_AND_INSTALL"]).optional().nullable(),
  taxStatus: z.string().max(80).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  salespersonId: z.string().optional().nullable(),
  estimatorId: z.string().optional().nullable(),
  requestedProposalDate: z.string().optional().nullable(),
  targetInstallDate: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("cabinetry:view");
    const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
    const opportunities = await prisma.cabinetryOpportunity.findMany({
      where: {
        companyId: user.companyId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, type: true } },
        project: { select: { id: true, name: true, status: true } },
        productLine: { select: { id: true, name: true, slug: true } },
      },
    });
    return NextResponse.json({ opportunities });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("cabinetry:opportunity:write");
    const body = createSchema.parse(await req.json());

    await ensureDefaultProductLines(user.companyId, user.id);

    let customerId = body.customerId;
    if (!customerId) {
      if (!body.customerName) {
        return NextResponse.json({ error: "customerId or customerName required" }, { status: 400 });
      }
      const customer = await prisma.customer.create({
        data: {
          companyId: user.companyId,
          name: body.customerName,
          type: "BUILDER",
          createdById: user.id,
        },
      });
      customerId = customer.id;
    } else {
      const owned = await prisma.customer.findFirst({
        where: { id: customerId, companyId: user.companyId },
      });
      if (!owned) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
    }

    let projectId = body.projectId;
    if (!projectId) {
      if (!body.projectName) {
        return NextResponse.json({ error: "projectId or projectName required" }, { status: 400 });
      }
      const project = await prisma.project.create({
        data: {
          companyId: user.companyId,
          name: body.projectName,
          address: body.projectAddress || null,
          customerId,
          createdById: user.id,
          status: "DRAFT",
        },
      });
      projectId = project.id;
    } else {
      const owned = await prisma.project.findFirst({
        where: { id: projectId, companyId: user.companyId },
      });
      if (!owned) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      if (!owned.customerId) {
        await prisma.project.update({
          where: { id: projectId },
          data: { customerId },
        });
      }
    }

    let productLineId = body.productLineId || null;
    if (!productLineId && body.productLineSlug) {
      const line = await prisma.cabinetryProductLine.findFirst({
        where: { companyId: user.companyId, slug: body.productLineSlug },
      });
      productLineId = line?.id || null;
    }

    const opportunity = await prisma.cabinetryOpportunity.create({
      data: {
        companyId: user.companyId,
        customerId,
        projectId,
        productLineId,
        stage: body.stage || "NEW",
        builderName: body.builderName || null,
        architectName: body.architectName || null,
        designerName: body.designerName || null,
        projectAddress: body.projectAddress || null,
        constructionType: body.constructionType || null,
        supplyScope: body.supplyScope || null,
        taxStatus: body.taxStatus || null,
        notes: body.notes || null,
        salespersonId: body.salespersonId || user.id,
        estimatorId: body.estimatorId || user.id,
        requestedProposalDate: body.requestedProposalDate
          ? new Date(body.requestedProposalDate)
          : null,
        targetInstallDate: body.targetInstallDate ? new Date(body.targetInstallDate) : null,
        createdById: user.id,
      },
      include: {
        customer: true,
        project: true,
        productLine: true,
      },
    });

    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "cabinetry.opportunity.created",
      entityType: "CabinetryOpportunity",
      entityId: opportunity.id,
      detail: `${opportunity.customer.name} / ${opportunity.project.name}`,
    });

    return NextResponse.json({ opportunity }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
