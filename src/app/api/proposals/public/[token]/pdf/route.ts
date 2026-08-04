import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { buildProposalPdf } from "@/lib/export/proposal-pdf";
import { proposalInclude } from "@/lib/proposals/service";

type Ctx = { params: Promise<{ token: string }> };

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
