import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError, requireUser } from "@/lib/auth";
import { submitQuote, syncPricing, toSpruceConfig } from "@/lib/spruce/client";
import { calculateEstimate } from "@/lib/estimate/calculator";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.enum(["sync-pricing", "submit-quote"]).default("submit-quote"),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const project = await ensureOwnedProject(id, user.companyId);
    const body = schema.parse(await req.json().catch(() => ({})));

    const settings = await prisma.spruceSettings.findUnique({ where: { companyId: user.companyId } });
    const config = toSpruceConfig(settings);

    const materials = await prisma.materialItem.findMany({
      where: { projectId: id, spruceSku: { not: null } },
    });

    if (!materials.length) {
      return NextResponse.json(
        { error: "No materials with Spruce SKUs. Run AI analysis first." },
        { status: 400 }
      );
    }

    if (body.action === "sync-pricing") {
      const skus = materials.map((m) => m.spruceSku!).filter(Boolean);
      const prices = await syncPricing(config, skus);

      for (const m of materials) {
        if (!m.spruceSku) continue;
        const price = prices.get(m.spruceSku);
        if (price != null) {
          await prisma.materialItem.update({
            where: { id: m.id },
            data: { unitCost: price },
          });
        }
      }

      const refreshed = await prisma.materialItem.findMany({ where: { projectId: id } });
      const totals = calculateEstimate(refreshed);
      await prisma.estimate.upsert({
        where: { projectId: id },
        create: { projectId: id, ...totals },
        update: totals,
      });

      await prisma.spruceSyncLog.create({
        data: {
          projectId: id,
          action: "sync-pricing",
          status: "ok",
          detail: `Updated pricing for ${prices.size} SKUs (${config.mockMode ? "mock" : "live"})`,
          payload: JSON.stringify(Object.fromEntries(prices)),
        },
      });

      return NextResponse.json({
        ok: true,
        mode: config.mockMode ? "mock" : "live",
        updatedSkus: prices.size,
      });
    }

    const lines = materials.map((m) => ({
      sku: m.spruceSku!,
      quantity: m.quantity,
      description: m.name,
      unitPrice: m.unitCost,
    }));

    const result = await submitQuote(config, lines, project.name);

    await prisma.spruceSyncLog.create({
      data: {
        projectId: id,
        action: "submit-quote",
        status: result.status,
        detail: result.message,
        payload: JSON.stringify(result),
      },
    });

    await prisma.project.update({
      where: { id },
      data: { status: "SYNCED" },
    });

    return NextResponse.json({ result });
  } catch (error) {
    try {
      const user = await requireUser();
      const { id } = await ctx.params;
      await prisma.spruceSyncLog.create({
        data: {
          projectId: id,
          action: "error",
          status: "failed",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
      });
      void user;
    } catch {
      /* ignore */
    }
    return jsonError(error);
  }
}
