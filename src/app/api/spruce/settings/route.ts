import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { z } from "zod";

export async function GET() {
  try {
    const user = await requirePermission("settings:view");
    let settings = await prisma.spruceSettings.findUnique({ where: { companyId: user.companyId } });
    if (!settings) {
      settings = await prisma.spruceSettings.create({
        data: { companyId: user.companyId, mockMode: true, enabled: true, branchCode: "MAIN" },
      });
    }

    return NextResponse.json({
      settings: {
        ...settings,
        apiKey: settings.apiKey ? "••••" + settings.apiKey.slice(-4) : null,
        hasApiKey: Boolean(settings.apiKey),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

const schema = z.object({
  apiEndpoint: z.string().url().nullable().optional().or(z.literal("")),
  soapEndpoint: z.string().url().nullable().optional().or(z.literal("")),
  apiKey: z.string().nullable().optional(),
  branchCode: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  enabled: z.boolean().optional(),
  mockMode: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const user = await requirePermission("spruce:configure");
    const body = schema.parse(await req.json());

    const data: Record<string, unknown> = {};
    if (body.apiEndpoint !== undefined) data.apiEndpoint = body.apiEndpoint || null;
    if (body.soapEndpoint !== undefined) data.soapEndpoint = body.soapEndpoint || null;
    if (body.apiKey !== undefined && body.apiKey !== null && !body.apiKey.startsWith("••••")) {
      data.apiKey = body.apiKey || null;
    }
    if (body.branchCode !== undefined) data.branchCode = body.branchCode;
    if (body.accountNumber !== undefined) data.accountNumber = body.accountNumber;
    if (body.enabled !== undefined) data.enabled = body.enabled;
    if (body.mockMode !== undefined) data.mockMode = body.mockMode;

    const settings = await prisma.spruceSettings.upsert({
      where: { companyId: user.companyId },
      create: {
        companyId: user.companyId,
        mockMode: true,
        enabled: true,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({
      settings: {
        ...settings,
        apiKey: settings.apiKey ? "••••" + settings.apiKey.slice(-4) : null,
        hasApiKey: Boolean(settings.apiKey),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
