import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bumpTokenVersion, hashPassword, jsonError } from "@/lib/auth";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const row = await consumeAuthToken(body.token, "PASSWORD_RESET");
    if (!row) {
      return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(body.password) },
    });
    await bumpTokenVersion(row.userId);
    await writeAuditLog({
      actorUserId: row.userId,
      action: "auth.password_reset",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
