import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { writeAuditLog } from "@/lib/audit";
import { proposalInclude } from "@/lib/proposals/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("proposal:view");
    const { id } = await ctx.params;
    const proposal = await prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
      include: proposalInclude,
    });
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    return NextResponse.json({ proposal });
  } catch (error) {
    return jsonError(error);
  }
}

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  intro: z.string().max(4000).optional().nullable(),
  scopeNotes: z.string().max(4000).optional().nullable(),
  exclusions: z.string().max(8000).optional().nullable(),
  terms: z.string().max(8000).optional().nullable(),
  customerName: z.string().max(200).optional().nullable(),
  customerEmail: z.string().email().optional().nullable().or(z.literal("")),
  projectAddress: z.string().max(400).optional().nullable(),
  depositPct: z.number().min(0).max(1).optional(),
  validUntil: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("proposal:write");
    const { id } = await ctx.params;
    const body = patchSchema.parse(await req.json());

    const existing = await prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Accepted proposals cannot be edited" }, { status: 400 });
    }

    const depositPct = body.depositPct ?? existing.depositPct;
    const depositAmount = Math.round(existing.grandTotal * depositPct * 100) / 100;

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.intro !== undefined ? { intro: body.intro } : {}),
        ...(body.scopeNotes !== undefined ? { scopeNotes: body.scopeNotes } : {}),
        ...(body.exclusions !== undefined ? { exclusions: body.exclusions } : {}),
        ...(body.terms !== undefined ? { terms: body.terms } : {}),
        ...(body.customerName !== undefined ? { customerName: body.customerName } : {}),
        ...(body.customerEmail !== undefined
          ? { customerEmail: body.customerEmail || null }
          : {}),
        ...(body.projectAddress !== undefined ? { projectAddress: body.projectAddress } : {}),
        ...(body.customerId !== undefined ? { customerId: body.customerId } : {}),
        ...(body.validUntil !== undefined
          ? { validUntil: body.validUntil ? new Date(body.validUntil) : null }
          : {}),
        depositPct,
        depositAmount,
      },
      include: proposalInclude,
    });

    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "proposal.updated",
      entityType: "Proposal",
      entityId: proposal.id,
      detail: proposal.number,
    });

    return NextResponse.json({ proposal });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("proposal:write");
    const { id } = await ctx.params;
    const existing = await prisma.proposal.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (existing.status === "ACCEPTED") {
      return NextResponse.json({ error: "Accepted proposals cannot be deleted" }, { status: 400 });
    }
    await prisma.proposal.delete({ where: { id } });
    await writeAuditLog({
      companyId: user.companyId,
      actorUserId: user.id,
      action: "proposal.deleted",
      entityType: "Proposal",
      entityId: id,
      detail: existing.number,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
