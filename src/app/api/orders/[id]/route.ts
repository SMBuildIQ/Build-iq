import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { TRACKING_SEQUENCE, nextStep, stepMeta } from "@/lib/commerce/tracking";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const order = await prisma.order.findFirst({
      where: {
        companyId: user.companyId,
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        tracking: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json({
      order,
      sequence: TRACKING_SEQUENCE,
      currentIndex: TRACKING_SEQUENCE.findIndex((s) => s.step === order.trackingStep),
    });
  } catch (error) {
    return jsonError(error);
  }
}

const advanceSchema = z.object({
  action: z.enum(["advance"]).default("advance"),
});

/** Advance tracking one step (owners/estimators — simulates yard/ops updates) */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    advanceSchema.parse(await req.json().catch(() => ({})));

    const order = await prisma.order.findFirst({
      where: { id, companyId: user.companyId },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const nxt = nextStep(order.trackingStep);
    if (!nxt) {
      return NextResponse.json({ error: "Order already fully delivered" }, { status: 400 });
    }

    const meta = stepMeta(nxt);
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        trackingStep: nxt,
        status: nxt === "DELIVERED" ? "DELIVERED" : "IN_FULFILLMENT",
        tracking: {
          create: {
            step: meta.step,
            label: meta.label,
            detail: meta.detail,
          },
        },
      },
      include: {
        items: true,
        tracking: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({
      order: updated,
      sequence: TRACKING_SEQUENCE,
      currentIndex: TRACKING_SEQUENCE.findIndex((s) => s.step === updated.trackingStep),
    });
  } catch (error) {
    return jsonError(error);
  }
}
