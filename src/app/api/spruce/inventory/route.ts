import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { lookupInventory, toSpruceConfig } from "@/lib/spruce/client";

export async function GET() {
  try {
    const user = await requireUser();
    const settings = await prisma.spruceSettings.findUnique({ where: { userId: user.id } });
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
