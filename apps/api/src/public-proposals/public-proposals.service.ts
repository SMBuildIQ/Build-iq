import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { acceptProposalSchema } from "@buildiq/validation";
import { PrismaService } from "../prisma/prisma.service";
import { ProposalStatus } from "@buildiq/prisma-client";

@Injectable()
export class PublicProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(token: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { publicToken: token },
      include: {
        sections: { include: { lines: true }, orderBy: { sortOrder: "asc" } },
        acceptance: true,
        company: { select: { name: true, phone: true, city: true, state: true } },
      },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");

    if (proposal.status === ProposalStatus.SENT && !proposal.viewedAt) {
      await this.prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.VIEWED, viewedAt: new Date() },
      });
      proposal.status = ProposalStatus.VIEWED;
      proposal.viewedAt = new Date();
    }

    return {
      proposal: {
        id: proposal.id,
        number: proposal.number,
        title: proposal.title,
        status: proposal.status,
        intro: proposal.intro,
        scopeNotes: proposal.scopeNotes,
        exclusions: proposal.exclusions,
        terms: proposal.terms,
        validUntil: proposal.validUntil,
        grandTotal: proposal.grandTotal,
        depositAmount: proposal.depositAmount,
        depositPct: proposal.depositPct,
        projectAddress: proposal.projectAddress,
        customerName: proposal.customerName,
        sections: proposal.sections,
        acceptance: proposal.acceptance,
        company: proposal.company,
      },
    };
  }

  async accept(token: string, body: unknown, meta: { ip?: string; userAgent?: string }) {
    const parsed = acceptProposalSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const proposal = await this.prisma.proposal.findUnique({
      where: { publicToken: token },
      include: { acceptance: true },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    if (proposal.acceptance) {
      throw new BadRequestException("Proposal already has a decision");
    }
    if (
      proposal.status === ProposalStatus.EXPIRED ||
      proposal.status === ProposalStatus.SUPERSEDED
    ) {
      throw new BadRequestException("Proposal is no longer actionable");
    }

    const { decision, signerName, signerEmail, signerTitle, notes } = parsed.data;
    const now = new Date();

    const [acceptance, updated] = await this.prisma.$transaction([
      this.prisma.proposalAcceptance.create({
        data: {
          proposalId: proposal.id,
          decision,
          signerName,
          signerEmail: signerEmail || null,
          signerTitle: signerTitle ?? null,
          notes: notes ?? null,
          ip: meta.ip,
          userAgent: meta.userAgent,
        },
      }),
      this.prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          status: decision === "ACCEPTED" ? ProposalStatus.ACCEPTED : ProposalStatus.DECLINED,
          acceptedAt: decision === "ACCEPTED" ? now : null,
          declinedAt: decision === "DECLINED" ? now : null,
        },
      }),
    ]);

    return { acceptance, proposal: updated };
  }
}
