import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { writeAuditLog } from "@/lib/audit";
import { createProposalFromProject, proposalInclude } from "@/lib/proposals/service";

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission("proposal:view");
    const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
    const status = req.nextUrl.searchParams.get("status") || undefined;

    const proposals = await prisma.proposal.findMany({
      where: {
        companyId: user.companyId,
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, status: true } },
        _count: { select: { sections: true } },
      },
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    return jsonError(error);
  }
}

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  customerId: z.string().optional().nullable(),
  depositPct: z.number().min(0).max(1).optional(),
  validDays: z.number().int().min(7).max(120).optional(),
  cabinetryOpportunityId: z.string().optional().nullable(),
});

/** Create a polished multi-category proposal from a project's takeoff. */
export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("proposal:write");
    const body = createSchema.parse(await req.json());

    const project = await prisma.project.findFirst({
      where: { id: body.projectId, companyId: user.companyId },
      include: {
        materials: true,
        estimate: true,
        company: { select: { name: true } },
        customer: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (body.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: body.customerId, companyId: user.companyId },
      });
      if (!customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
    }

    const proposal = await createProposalFromProject({
      companyId: user.companyId,
      createdById: user.id,
      project,
      materials: project.materials,
      estimate: project.estimate,
      customerId: body.customerId,
      title: body.title,
      depositPct: body.depositPct,
      validDays: body.validDays,
      cabinetryOpportunityId: body.cabinetryOpportunityId,
    });

    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "proposal.created",
      entityType: "Proposal",
      entityId: proposal.id,
      detail: `${proposal.number} from project ${project.name}`,
    });

    // Re-fetch with full include shape
    const full = await prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: proposalInclude,
    });

    return NextResponse.json({ proposal: full }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
