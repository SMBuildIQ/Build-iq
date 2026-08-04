import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail, appBaseUrl } from "@/lib/email";
import { LEGAL } from "@/lib/legal";
import { proposalInclude } from "@/lib/proposals/service";
import { formatCurrencyExact } from "@/lib/format";

type Ctx = { params: Promise<{ id: string }> };

const sendSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("proposal:send");
    const { id } = await ctx.params;
    const body = sendSchema.parse(await req.json().catch(() => ({})));

    const existing = await prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
      include: { sections: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (!existing.sections.length) {
      return NextResponse.json({ error: "Proposal has no sections" }, { status: 400 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Proposal already accepted" }, { status: 400 });
    }

    const to = body.email || existing.customerEmail;
    if (!to) {
      return NextResponse.json(
        { error: "Customer email required — set it on the proposal or pass email" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        customerEmail: to,
      },
      include: proposalInclude,
    });

    const link = `${appBaseUrl()}/p/${proposal.publicToken}`;
    const text = [
      `Hello${proposal.customerName ? ` ${proposal.customerName}` : ""},`,
      "",
      body.message ||
        `${LEGAL.entityName} has prepared material proposal ${proposal.number} for your review.`,
      "",
      `Title: ${proposal.title}`,
      `Total: ${formatCurrencyExact(proposal.grandTotal)}`,
      `Deposit (${Math.round(proposal.depositPct * 100)}%): ${formatCurrencyExact(proposal.depositAmount)}`,
      `Valid through: ${proposal.validUntil ? new Date(proposal.validUntil).toLocaleDateString() : "see PDF"}`,
      "",
      `Review & accept online: ${link}`,
      "",
      `You can also download the PDF from the link above.`,
      "",
      `— ${LEGAL.productName} by ${LEGAL.entityName}`,
      LEGAL.supportEmail,
    ].join("\n");

    const mail = await sendEmail({
      to,
      subject: `${proposal.number} — ${proposal.title}`,
      text,
    });

    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "proposal.sent",
      entityType: "Proposal",
      entityId: proposal.id,
      detail: `to ${to} via ${mail.provider}`,
    });

    return NextResponse.json({
      proposal,
      publicUrl: link,
      email: { ok: mail.ok, provider: mail.provider, to },
    });
  } catch (error) {
    return jsonError(error);
  }
}
