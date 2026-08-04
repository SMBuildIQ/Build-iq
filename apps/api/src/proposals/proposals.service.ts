import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createProposalSchema, sendProposalSchema } from "@buildiq/validation";
import { depositAmount } from "@buildiq/pricing";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "../auth/auth.decorators";
import { ProposalStatus } from "@buildiq/prisma-client";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async list(user: AuthUser) {
    const proposals = await this.prisma.proposal.findMany({
      where: { companyId: user.companyId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { sections: true } },
        customer: true,
      },
    });
    return {
      proposals: proposals.map((p) => ({
        id: p.id,
        number: p.number,
        title: p.title,
        status: p.status,
        grandTotal: p.grandTotal,
        depositAmount: p.depositAmount,
        depositPct: p.depositPct,
        sectionCount: p._count.sections,
        projectId: p.projectId,
        customerName: p.customerName ?? p.customer?.name ?? null,
        updatedAt: p.updatedAt.toISOString(),
      })),
    };
  }

  async create(user: AuthUser, body: unknown) {
    const parsed = createProposalSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { projectId, title, customerId, depositPct, validDays } = parsed.data;

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, companyId: user.companyId },
      include: { estimate: true, materials: true },
    });
    if (!project) throw new NotFoundException("Project not found");

    const count = await this.prisma.proposal.count({ where: { companyId: user.companyId } });
    const year = new Date().getFullYear();
    const number = `PRO-${year}-${String(count + 1).padStart(5, "0")}`;
    const pct = depositPct ?? 0.3;
    const grandTotal = project.estimate?.grandTotal ?? 0;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validDays ?? 30));

    const proposal = await this.prisma.proposal.create({
      data: {
        number,
        title: title ?? `${project.name} Proposal`,
        companyId: user.companyId,
        projectId: project.id,
        customerId: customerId ?? project.customerId,
        createdById: user.userId,
        depositPct: pct,
        depositAmount: depositAmount(grandTotal, pct),
        grandTotal,
        materialSubtotal: project.estimate?.materialCost ?? 0,
        laborSubtotal: project.estimate?.laborCost ?? 0,
        wasteSubtotal: project.estimate?.wasteCost ?? 0,
        contingencyAmount: project.estimate?.contingencyCost ?? 0,
        overheadAmount: project.estimate?.overheadCost ?? 0,
        profitAmount: project.estimate?.profitAmount ?? 0,
        taxAmount: project.estimate?.taxAmount ?? 0,
        validUntil,
        projectAddress: [project.address, project.city, project.state, project.zip]
          .filter(Boolean)
          .join(", ") || null,
      },
    });

    return { proposal };
  }

  async get(user: AuthUser, id: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        sections: { include: { lines: true }, orderBy: { sortOrder: "asc" } },
        acceptance: true,
        customer: true,
        project: true,
      },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    return { proposal };
  }

  async patch(user: AuthUser, id: string, body: Record<string, unknown>) {
    const existing = await this.prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new NotFoundException("Proposal not found");

    const data: {
      title?: string;
      intro?: string | null;
      scopeNotes?: string | null;
      exclusions?: string | null;
      terms?: string | null;
      depositPct?: number;
      depositAmount?: number;
      status?: ProposalStatus;
    } = {};

    if (typeof body.title === "string") data.title = body.title;
    if ("intro" in body) data.intro = (body.intro as string) ?? null;
    if ("scopeNotes" in body) data.scopeNotes = (body.scopeNotes as string) ?? null;
    if ("exclusions" in body) data.exclusions = (body.exclusions as string) ?? null;
    if ("terms" in body) data.terms = (body.terms as string) ?? null;
    if (typeof body.depositPct === "number") {
      data.depositPct = body.depositPct;
      data.depositAmount = depositAmount(existing.grandTotal, body.depositPct);
    }
    if (typeof body.status === "string" && body.status in ProposalStatus) {
      data.status = body.status as ProposalStatus;
    }

    const proposal = await this.prisma.proposal.update({ where: { id }, data });
    return { proposal };
  }

  async send(user: AuthUser, id: string, body: unknown) {
    const parsed = sendProposalSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const existing = await this.prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new NotFoundException("Proposal not found");

    const proposal = await this.prisma.proposal.update({
      where: { id },
      data: {
        status: ProposalStatus.SENT,
        sentAt: new Date(),
        customerEmail: parsed.data.email ?? existing.customerEmail,
      },
    });

    return {
      proposal,
      publicUrl: `/public/proposals/${proposal.publicToken}`,
      message: parsed.data.message ?? null,
      stub: true,
    };
  }

  async pdf(user: AuthUser, id: string) {
    const existing = await this.prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) throw new NotFoundException("Proposal not found");

    const filename = `${existing.number}.pdf`;
    // Minimal synthetic PDF bytes — real renderer TBD.
    const stubPdf = Buffer.from(
      `%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%% BuildIQ stub proposal ${existing.number}\n%%EOF\n`,
    );
    await this.storage.upload(`proposals/${existing.id}.pdf`, stubPdf, "application/pdf");

    return {
      buffer: stubPdf,
      filename,
      stub: true,
      proposalId: existing.id,
      number: existing.number,
      contentType: "application/pdf" as const,
    };
  }
}
