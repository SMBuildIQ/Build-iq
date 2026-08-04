import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { z } from "zod";

function createInviteCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function GET() {
  try {
    const user = await requireUser();
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
  role: z.enum(["ESTIMATOR", "VIEWER", "OWNER"]).default("ESTIMATOR"),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user.role !== "OWNER") {
      return NextResponse.json({ error: "Only company owners can invite builders" }, { status: 403 });
    }

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
