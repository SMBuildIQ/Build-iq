import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { lookupInventory, toSpruceConfig } from "@/lib/spruce/client";

export async function GET() {
  try {
    const user = await requirePermission("spruce:sync");
    const settings = await prisma.spruceSettings.findUnique({ where: { companyId: user.companyId } });
    const config = toSpruceConfig(settings);
    const inventory = await lookupInventory(config);
    return NextResponse.json({
      mode: config.mockMode || !config.apiKey ? "mock" : "live",
      inventory,
    });
  } catch (error) {
    return jsonError(error);
  }
}
