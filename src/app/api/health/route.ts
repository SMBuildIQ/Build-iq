import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { paymentConfigured, mockPaymentsAllowed } from "@/lib/commerce/payments";
import { LEGAL } from "@/lib/legal";

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
    legalPoliciesDraft: LEGAL.policiesAreDrafts,
    version: process.env.npm_package_version || "0.1.0",
  };

  return NextResponse.json(body, { status: ready ? 200 : 503 });
}
