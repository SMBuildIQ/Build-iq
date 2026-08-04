import { prisma } from "@/lib/prisma";
import { analyzeBlueprints } from "@/lib/ai/blueprint-analyzer";
import { calculateEstimate } from "@/lib/estimate/calculator";
import { TRADE_ORDER } from "@/lib/materials/catalog";
import { MATERIAL_PACKAGES } from "@/lib/materials/packages";
import { syncPricing, submitQuote, toSpruceConfig } from "@/lib/spruce/client";
import { getOrCreateCart } from "@/lib/commerce/cart";
import { BOT_ROSTER, type BotEvent, type BotId } from "@/lib/ai/bots-client";

export type { BotEvent, BotId };
export { BOT_ROSTER };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function botName(id: BotId) {
  return BOT_ROSTER.find((b) => b.id === id)?.name || id;
}

/** Map takeoff categories/trades to shop material packages */
function recommendPackageSlugs(materials: { category: string; trade: string }[]) {
  const cats = new Set(materials.map((m) => m.category.toLowerCase()));
  const trades = new Set(materials.map((m) => m.trade.toLowerCase()));
  const slugs: string[] = [];

  if (cats.has("windows") || trades.has("windows & doors")) slugs.push("windows-residential-takeoff");
  if (cats.has("doors") || trades.has("windows & doors")) {
    slugs.push("doors-residential-takeoff");
    slugs.push("door-hardware-residential");
  }
  if (cats.has("lumber") || trades.has("framing")) slugs.push("lumber-framing-takeoff");
  if (trades.has("roofing") || cats.has("sheathing")) slugs.push("trusses-roof-takeoff");
  if (trades.has("foundation") || cats.has("concrete")) slugs.push("masonry-stone-veneer");
  // Millwork & cabinetry commonly needed on residential
  slugs.push("millwork-trim-takeoff");
  slugs.push("cabinetry-kitchen-bath");

  return [...new Set(slugs)];
}

export async function runBotPipeline(
  projectId: string,
  companyId: string,
  emit: (event: BotEvent) => void,
  options: { fillCart?: boolean; syncSpruce?: boolean } = { fillCart: true, syncSpruce: true }
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });
  if (!project) {
    emit({ type: "error", message: "Project not found" });
    return;
  }

  emit({
    type: "pipeline_start",
    message: "AI crew starting — streamlining takeoff through procurement.",
    progress: 0,
  });

  await prisma.project.update({ where: { id: projectId }, data: { status: "ANALYZING" } });

  // 1. Plan Reader + Vision/OCR scan
  emit({
    type: "bot_start",
    bot: "plan-reader",
    botName: botName("plan-reader"),
    message: "Reading uploaded plan sheets with OCR and drawing vision…",
    progress: 5,
  });
  await sleep(200);

  const blueprints = await prisma.blueprint.findMany({ where: { projectId } });
  if (!blueprints.length) {
    emit({ type: "error", bot: "plan-reader", message: "Upload blueprints first so the bots have plans to read." });
    await prisma.project.update({ where: { id: projectId }, data: { status: "DRAFT" } });
    return;
  }

  const { scanBlueprint, mergeVisionMaterialsFromBlueprints } = await import("@/lib/plans/scan");
  let visionReady = 0;
  let ocrReady = 0;
  for (let i = 0; i < blueprints.length; i++) {
    const bp = blueprints[i];
    emit({
      type: "bot_progress",
      bot: "plan-reader",
      botName: botName("plan-reader"),
      message: `Scanning ${bp.originalName} (${i + 1}/${blueprints.length}) — rasterize, OCR, vision…`,
      progress: 6 + Math.round((i / Math.max(blueprints.length, 1)) * 8),
    });
    try {
      const result = await scanBlueprint(
        bp.id,
        {
          projectName: project.name,
          squareFeet: project.squareFeet || 2200,
          stories: project.stories || 1,
          notes: project.notes,
        },
        { runOcr: true, runVision: true }
      );
      if (result.ocr?.text) ocrReady += 1;
      if (result.usedVision) visionReady += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "scan failed";
      emit({
        type: "bot_progress",
        bot: "plan-reader",
        botName: botName("plan-reader"),
        message: `Could not fully scan ${bp.originalName}: ${msg}`,
        progress: 6 + Math.round(((i + 1) / Math.max(blueprints.length, 1)) * 8),
      });
    }
  }

  const scanned = await prisma.blueprint.findMany({ where: { projectId } });
  const sheetSummary = scanned.map((b) => b.sheetType || "General");
  emit({
    type: "bot_progress",
    bot: "plan-reader",
    botName: botName("plan-reader"),
    message: `Classified ${scanned.length} sheet(s): ${[...new Set(sheetSummary)].join(", ")}. OCR on ${ocrReady}, vision on ${visionReady}.`,
    progress: 12,
    data: { blueprintCount: scanned.length, sheets: sheetSummary, ocrReady, visionReady },
  });
  emit({
    type: "bot_done",
    bot: "plan-reader",
    botName: botName("plan-reader"),
    message: visionReady
      ? "Plan set scanned with drawing vision — ready for takeoff."
      : "Plan set OCR’d — ready for takeoff (add OPENAI_API_KEY for true vision).",
    progress: 14,
  });

  // 2. Takeoff Bot
  emit({
    type: "bot_start",
    bot: "takeoff",
    botName: botName("takeoff"),
    message: visionReady ? "Running vision-grounded material takeoff…" : "Running AI material takeoff…",
    progress: 18,
  });
  await sleep(200);

  const visionMaterials = mergeVisionMaterialsFromBlueprints(scanned.map((b) => b.visionJson));
  const ocrText = scanned
    .map((b) => b.ocrText)
    .filter(Boolean)
    .join("\n\n");

  const detected = await analyzeBlueprints({
    projectName: project.name,
    squareFeet: project.squareFeet || 2200,
    stories: project.stories || 1,
    blueprintNames: scanned.map((b) => b.originalName),
    notes: project.notes,
    ocrText,
    visionMaterials,
    preferVision: true,
  });

  emit({
    type: "bot_progress",
    bot: "takeoff",
    botName: botName("takeoff"),
    message: `Identified ${detected.length} material lines across ${new Set(detected.map((d) => d.trade)).size} trades.`,
    progress: 32,
  });

  await prisma.materialItem.deleteMany({ where: { projectId } });
  await prisma.bidPackage.deleteMany({ where: { projectId } });
  await prisma.estimate.deleteMany({ where: { projectId } });

  await prisma.materialItem.createMany({
    data: detected.map((m) => ({
      projectId,
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

  if (scanned[0]) {
    let prior: Record<string, unknown> = {};
    try {
      prior = scanned[0].analysisJson ? JSON.parse(scanned[0].analysisJson) : {};
    } catch {
      prior = {};
    }
    await prisma.blueprint.update({
      where: { id: scanned[0].id },
      data: {
        analysisJson: JSON.stringify({
          ...prior,
          materialCount: detected.length,
          engine: detected[0]?.source || "ai",
          bots: true,
          analyzedAt: new Date().toISOString(),
        }),
      },
    });
  }

  emit({
    type: "bot_done",
    bot: "takeoff",
    botName: botName("takeoff"),
    message: "Takeoff complete.",
    progress: 38,
    data: { materialCount: detected.length },
  });

  // 3. Estimate Bot
  emit({
    type: "bot_start",
    bot: "estimate",
    botName: botName("estimate"),
    message: "Calculating materials, labor, waste, contingency, and markup…",
    progress: 42,
  });
  await sleep(250);

  const materials = await prisma.materialItem.findMany({ where: { projectId } });
  const totals = calculateEstimate(materials);
  const estimate = await prisma.estimate.create({
    data: { projectId, ...totals },
  });

  emit({
    type: "bot_done",
    bot: "estimate",
    botName: botName("estimate"),
    message: `Estimate ready — grand total $${totals.grandTotal.toLocaleString()}.`,
    progress: 52,
    data: { grandTotal: totals.grandTotal, estimateId: estimate.id },
  });

  // 4. Bid Bot
  emit({
    type: "bot_start",
    bot: "bids",
    botName: botName("bids"),
    message: "Building subcontractor bid packages by trade…",
    progress: 56,
  });
  await sleep(250);

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
        projectId,
        trade,
        title: `${trade} Bid Package — ${project.name}`,
        description: `AI-generated scope for ${trade}. Quantities from plan takeoff — field-verify before award.`,
        dueDate: due,
        status: "DRAFT",
      },
    });
    await prisma.materialItem.updateMany({
      where: { projectId, trade },
      data: { bidPackageId: pkg.id },
    });
    emit({
      type: "bot_progress",
      bot: "bids",
      botName: botName("bids"),
      message: `Packaged ${trade}.`,
      progress: 56 + Math.round((orderedTrades.indexOf(trade) / Math.max(orderedTrades.length, 1)) * 10),
    });
  }

  emit({
    type: "bot_done",
    bot: "bids",
    botName: botName("bids"),
    message: `Created ${orderedTrades.length} bid packages.`,
    progress: 68,
    data: { bidPackageCount: orderedTrades.length },
  });

  // 5. Package Bot — recommend + fill cart
  emit({
    type: "bot_start",
    bot: "packages",
    botName: botName("packages"),
    message: "Matching takeoff to shop packages (windows, doors, lumber, trusses…)…",
    progress: 72,
  });
  await sleep(300);

  // Ensure catalog exists
  const existingPkgs = await prisma.materialPackage.count();
  if (!existingPkgs) {
    await prisma.materialPackage.createMany({ data: MATERIAL_PACKAGES.map((p) => ({ ...p })) });
  }

  const recommendedSlugs = recommendPackageSlugs(materials);
  const recommended = await prisma.materialPackage.findMany({
    where: { slug: { in: recommendedSlugs }, active: true },
  });

  let cartCount = 0;
  if (options.fillCart !== false && recommended.length) {
    const cart = await getOrCreateCart(companyId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    for (const pkg of recommended) {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          packageId: pkg.id,
          quantity: 1,
          projectId,
        },
      });
      cartCount += 1;
    }
  }

  emit({
    type: "bot_done",
    bot: "packages",
    botName: botName("packages"),
    message:
      cartCount > 0
        ? `Added ${cartCount} takeoff packages to your cart.`
        : `Recommended ${recommended.length} packages (cart fill skipped).`,
    progress: 82,
    data: {
      recommended: recommended.map((p) => ({ id: p.id, name: p.name, category: p.category, unitPrice: p.unitPrice })),
      cartCount,
    },
  });

  // 6. Spruce Bot
  emit({
    type: "bot_start",
    bot: "spruce",
    botName: botName("spruce"),
    message: "Syncing Spruce pricing and preparing quote…",
    progress: 86,
  });
  await sleep(300);

  let spruceDetail = "Spruce sync skipped.";
  if (options.syncSpruce !== false) {
    try {
      const settings = await prisma.spruceSettings.findUnique({ where: { companyId } });
      const config = toSpruceConfig(settings);
      const skus = materials.map((m) => m.spruceSku).filter((s): s is string => Boolean(s));
      const prices = await syncPricing(config, skus);
      for (const m of materials) {
        if (!m.spruceSku) continue;
        const price = prices.get(m.spruceSku);
        if (price != null) {
          await prisma.materialItem.update({ where: { id: m.id }, data: { unitCost: price } });
        }
      }
      const refreshed = await prisma.materialItem.findMany({ where: { projectId } });
      const retotals = calculateEstimate(refreshed);
      await prisma.estimate.update({ where: { projectId }, data: retotals });

      const quote = await submitQuote(
        config,
        refreshed
          .filter((m) => m.spruceSku)
          .map((m) => ({
            sku: m.spruceSku!,
            quantity: m.quantity,
            description: m.name,
            unitPrice: m.unitCost,
          })),
        project.name
      );

      await prisma.spruceSyncLog.create({
        data: {
          projectId,
          action: "bot-pipeline",
          status: quote.status,
          detail: quote.message,
          payload: JSON.stringify(quote),
        },
      });
      spruceDetail = `${quote.message} Quote ${quote.quoteNumber}.`;
    } catch (err) {
      spruceDetail = err instanceof Error ? err.message : "Spruce sync failed";
      await prisma.spruceSyncLog.create({
        data: {
          projectId,
          action: "bot-pipeline",
          status: "failed",
          detail: spruceDetail,
        },
      });
    }
  }

  emit({
    type: "bot_done",
    bot: "spruce",
    botName: botName("spruce"),
    message: spruceDetail,
    progress: 92,
  });

  // 7. Briefing Bot
  emit({
    type: "bot_start",
    bot: "briefing",
    botName: botName("briefing"),
    message: "Writing your builder briefing…",
    progress: 95,
  });
  await sleep(200);

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ESTIMATED" },
  });

  const briefing = [
    `Plans read: ${scanned.length} sheets · OCR ${ocrReady} · vision ${visionReady}.`,
    `Takeoff: ${materials.length} lines · ${orderedTrades.length} bid packages.`,
    `Estimate: $${totals.grandTotal.toLocaleString()}.`,
    cartCount ? `Cart loaded with ${cartCount} material packages — open Cart to pay with Apple Pay / Google Pay.` : "Review Shop for material packages.",
    "Next: review takeoff, send bid packages, checkout packages, track delivery.",
  ].join(" ");

  emit({
    type: "bot_done",
    bot: "briefing",
    botName: botName("briefing"),
    message: briefing,
    progress: 100,
    data: { briefing },
  });

  emit({
    type: "pipeline_done",
    message: "AI crew finished. Your job is streamlined end-to-end.",
    progress: 100,
    data: {
      materialCount: materials.length,
      bidPackageCount: orderedTrades.length,
      grandTotal: totals.grandTotal,
      cartCount,
      recommendedCategories: recommended.map((p) => p.category),
    },
  });
}
