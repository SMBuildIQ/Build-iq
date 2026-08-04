import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { proposalInclude } from "@/lib/proposals/service";
import { buildProposalPdf } from "@/lib/export/proposal-pdf";

type Ctx = { params: Promise<{ token: string }> };

/** Public (token) proposal payload for customer review. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const proposal = await prisma.proposal.findFirst({
      where: { publicToken: token },
      include: proposalInclude,
    });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status === "SENT") {
      await prisma.proposal.update({
        where: { id: proposal.id },
        data: { status: "VIEWED", viewedAt: proposal.viewedAt || new Date() },
      });
      proposal.status = "VIEWED";
      proposal.viewedAt = proposal.viewedAt || new Date();
    }

    // Strip internal fields not needed publicly
    return NextResponse.json({
      proposal: {
        id: proposal.id,
        number: proposal.number,
        title: proposal.title,
        status: proposal.status,
        version: proposal.version,
        intro: proposal.intro,
        scopeNotes: proposal.scopeNotes,
        exclusions: proposal.exclusions,
        terms: proposal.terms,
        validUntil: proposal.validUntil,
        depositPct: proposal.depositPct,
        materialSubtotal: proposal.materialSubtotal,
        laborSubtotal: proposal.laborSubtotal,
        wasteSubtotal: proposal.wasteSubtotal,
        contingencyAmount: proposal.contingencyAmount,
        overheadAmount: proposal.overheadAmount,
        profitAmount: proposal.profitAmount,
        taxAmount: proposal.taxAmount,
        grandTotal: proposal.grandTotal,
        depositAmount: proposal.depositAmount,
        customerName: proposal.customerName,
        projectAddress: proposal.projectAddress,
        sentAt: proposal.sentAt,
        acceptedAt: proposal.acceptedAt,
        declinedAt: proposal.declinedAt,
        company: proposal.company,
        project: proposal.project
          ? { name: proposal.project.name, address: proposal.project.address, city: proposal.project.city, state: proposal.project.state, zip: proposal.project.zip }
          : null,
        sections: proposal.sections,
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

/** Public PDF download by token. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { token } = await ctx.params;
    const action = req.nextUrl.searchParams.get("action");
    if (action !== "pdf") {
      return NextResponse.json({ error: "Use POST ?action=pdf for PDF download" }, { status: 400 });
    }

    const proposal = await prisma.proposal.findFirst({
      where: { publicToken: token },
      include: proposalInclude,
    });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const buffer = await buildProposalPdf(proposal);
    const filename = `${proposal.number.toLowerCase()}-proposal.pdf`;
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
