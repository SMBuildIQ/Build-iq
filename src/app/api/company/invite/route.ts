import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { requirePermission } from "@/lib/require-permission";
import { z } from "zod";

const INVITE_ROLES = [
  "OWNER",
  "ADMIN",
  "PROJECT_MANAGER",
  "SUPERINTENDENT",
  "ESTIMATOR",
  "PURCHASING",
  "ACCOUNTANT",
  "DESIGNER",
  "SALES",
  "VIEWER",
] as const;

function createInviteCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function GET() {
  try {
    const user = await requirePermission("team:view");
    const invites = await prisma.invite.findMany({
      where: { companyId: user.companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ invites });
  } catch (error) {
    return jsonError(error);
  }
}

const schema = z.object({
  email: z.string().email().optional(),
  role: z.enum(INVITE_ROLES).default("ESTIMATOR"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requirePermission("team:invite");

    const body = schema.parse(await req.json().catch(() => ({})));
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const invite = await prisma.invite.create({
      data: {
        companyId: user.companyId,
        email: body.email?.toLowerCase() || null,
        role: body.role,
        code: createInviteCode(),
        expiresAt,
      },
    });

    return NextResponse.json({
      invite,
      signupPath: `/signup?invite=${invite.code}`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
