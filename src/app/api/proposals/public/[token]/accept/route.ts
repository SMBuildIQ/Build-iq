import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { proposalInclude } from "@/lib/proposals/service";

type Ctx = { params: Promise<{ token: string }> };

const acceptSchema = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  signerName: z.string().min(1).max(200),
  signerEmail: z.string().email().optional().nullable().or(z.literal("")),
  signerTitle: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const body = acceptSchema.parse(await req.json());

    const existing = await prisma.proposal.findFirst({
      where: { publicToken: token },
      include: { acceptance: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.acceptance) {
      return NextResponse.json({ error: "This proposal was already responded to" }, { status: 400 });
    }
    if (!["SENT", "VIEWED", "DRAFT"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Proposal cannot be ${body.decision.toLowerCase()} in status ${existing.status}` },
        { status: 400 }
      );
    }
    if (existing.validUntil && existing.validUntil < new Date() && body.decision === "ACCEPTED") {
      await prisma.proposal.update({
        where: { id: existing.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "This proposal has expired" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent");

    const now = new Date();
    const proposal = await prisma.$transaction(async (tx) => {
      await tx.proposalAcceptance.create({
        data: {
          proposalId: existing.id,
          decision: body.decision,
          signerName: body.signerName,
          signerEmail: body.signerEmail || null,
          signerTitle: body.signerTitle || null,
          notes: body.notes || null,
          ip,
          userAgent: userAgent?.slice(0, 400) || null,
        },
      });
      return tx.proposal.update({
        where: { id: existing.id },
        data: {
          status: body.decision,
          acceptedAt: body.decision === "ACCEPTED" ? now : null,
          declinedAt: body.decision === "DECLINED" ? now : null,
        },
        include: proposalInclude,
      });
    });

    await writeAuditLog({
      companyId: existing.companyId,
      action: body.decision === "ACCEPTED" ? "proposal.accepted" : "proposal.declined",
      entityType: "Proposal",
      entityId: existing.id,
      detail: `${body.signerName}${body.signerEmail ? ` <${body.signerEmail}>` : ""}`,
      ip: ip || undefined,
    });

    return NextResponse.json({
      proposal: {
        id: proposal.id,
        number: proposal.number,
        status: proposal.status,
        depositAmount: proposal.depositAmount,
        grandTotal: proposal.grandTotal,
        acceptance: proposal.acceptance
          ? {
              decision: proposal.acceptance.decision,
              signerName: proposal.acceptance.signerName,
              createdAt: proposal.acceptance.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
