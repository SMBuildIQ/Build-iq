import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentConfigured, mockPaymentsAllowed } from "@/lib/commerce/payments";
import { LEGAL } from "@/lib/legal";
import { AGENT_REGISTRY, WORKFLOWS, activeAgents } from "@/lib/ai/orchestration/registry";

/** Liveness + readiness for load balancers and launch checks */
export async function GET() {
  let database: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "error";
  }

  const ready = database === "ok";
  const body = {
    status: ready ? "ok" : "degraded",
    product: LEGAL.productName,
    operator: LEGAL.entityName,
    time: new Date().toISOString(),
    database,
    payments: {
      stripeConfigured: paymentConfigured(),
      mockAllowed: mockPaymentsAllowed(),
    },
    ai: {
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      visionModel: process.env.OPENAI_VISION_MODEL || "gpt-4o",
      activeAgents: activeAgents().length,
      registeredAgents: AGENT_REGISTRY.length,
      workflows: WORKFLOWS.map((w) => w.id),
    },
    features: {
      orchestration: true,
      planOcr: true,
      planVision: Boolean(process.env.OPENAI_API_KEY),
      planMeasuring: true,
      excelExport: true,
      pdfExport: true,
      customerProposals: true,
      cabinetryModule: "partial",
    },
    legalPoliciesDraft: LEGAL.policiesAreDrafts,
    release: "1.0.0-soft",
    version: process.env.npm_package_version || "1.0.0",
  };

  return NextResponse.json(body, { status: ready ? 200 : 503 });
}
