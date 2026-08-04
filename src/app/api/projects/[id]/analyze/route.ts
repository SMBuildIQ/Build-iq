import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOwnedProject, jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { analyzeBlueprints } from "@/lib/ai/blueprint-analyzer";
import { calculateEstimate } from "@/lib/estimate/calculator";
import { TRADE_ORDER } from "@/lib/materials/catalog";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requirePermission("estimate:run");
    const { id } = await ctx.params;
    const project = await ensureOwnedProject(id, user.companyId);

    await prisma.project.update({
      where: { id },
      data: { status: "ANALYZING" },
    });

    const blueprints = await prisma.blueprint.findMany({ where: { projectId: id } });

    const detected = await analyzeBlueprints({
      projectName: project.name,
      squareFeet: project.squareFeet || 2200,
      stories: project.stories || 1,
      blueprintNames: blueprints.map((b) => b.originalName),
      notes: project.notes,
    });

    // Replace prior takeoff
    await prisma.materialItem.deleteMany({ where: { projectId: id } });
    await prisma.bidPackage.deleteMany({ where: { projectId: id } });
    await prisma.estimate.deleteMany({ where: { projectId: id } });

    await prisma.materialItem.createMany({
      data: detected.map((m) => ({
        projectId: id,
        category: m.category,
        trade: m.trade,
        name: m.name,
        description: m.description,
        quantity: m.quantity,
        unit: m.unit,
        unitCost: m.unitCost,
        laborHours: m.laborHours,
        laborRate: m.laborRate,
        wasteFactor: m.wasteFactor,
        spruceSku: m.spruceSku,
        source: m.source,
        confidence: m.confidence,
      })),
    });

    const materials = await prisma.materialItem.findMany({ where: { projectId: id } });
    const totals = calculateEstimate(materials);

    const estimate = await prisma.estimate.create({
      data: {
        projectId: id,
        ...totals,
      },
    });

    // Create bid packages by trade
    const trades = [...new Set(materials.map((m) => m.trade))];
    const orderedTrades = [
      ...TRADE_ORDER.filter((t) => trades.includes(t)),
      ...trades.filter((t) => !TRADE_ORDER.includes(t)),
    ];

    const due = new Date();
    due.setDate(due.getDate() + 14);

    for (const trade of orderedTrades) {
      const pkg = await prisma.bidPackage.create({
        data: {
          projectId: id,
          trade,
          title: `${trade} Bid Package — ${project.name}`,
          description: `Please provide labor and material pricing for the ${trade.toLowerCase()} scope listed below. Quantities are from AI takeoff and should be field-verified.`,
          dueDate: due,
          status: "DRAFT",
        },
      });

      await prisma.materialItem.updateMany({
        where: { projectId: id, trade },
        data: { bidPackageId: pkg.id },
      });
    }

    // Store analysis summary on first blueprint
    if (blueprints[0]) {
      await prisma.blueprint.update({
        where: { id: blueprints[0].id },
        data: {
          analysisJson: JSON.stringify({
            materialCount: materials.length,
            trades: orderedTrades,
            engine: detected[0]?.source || "ai",
            analyzedAt: new Date().toISOString(),
          }),
        },
      });
    }

    await prisma.project.update({
      where: { id },
      data: { status: "ESTIMATED" },
    });

    const refreshed = await prisma.project.findUnique({
      where: { id },
      include: {
        blueprints: true,
        materials: { orderBy: [{ trade: "asc" }, { name: "asc" }] },
        estimate: true,
        bidPackages: { include: { materials: true } },
      },
    });

    return NextResponse.json({
      project: refreshed,
      estimate,
      materialCount: materials.length,
      bidPackageCount: orderedTrades.length,
    });
  } catch (error) {
    try {
      const { id } = await ctx.params;
      await prisma.project.update({ where: { id }, data: { status: "DRAFT" } });
    } catch {
      /* ignore */
    }
    return jsonError(error);
  }
}
