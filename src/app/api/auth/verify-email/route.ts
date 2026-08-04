import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireUser } from "@/lib/auth";
import { issueAuthToken, consumeAuthToken } from "@/lib/auth-tokens";
import { appBaseUrl, sendEmail } from "@/lib/email";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

/** Authenticated user requests a verification email */
export async function POST() {
  try {
    const user = await requireUser();
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || dbUser.emailVerifiedAt) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const { raw } = await issueAuthToken(user.id, "EMAIL_VERIFY", 24 * 60);
    const link = `${appBaseUrl()}/verify-email?token=${raw}`;
    await sendEmail({
      to: dbUser.email,
      subject: "Verify your BuildIQ email",
      text: `Verify your email:\n\n${link}\n\nThis link expires in 24 hours.`,
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (error) {
    return jsonError(error);
  }
}

const confirmSchema = z.object({ token: z.string().min(20) });

/** Confirm email with token (can be unauthenticated) */
export async function PUT(req: NextRequest) {
  try {
    const body = confirmSchema.parse(await req.json());
    const row = await consumeAuthToken(body.token, "EMAIL_VERIFY");
    if (!row) {
      return NextResponse.json({ error: "Verification link is invalid or expired" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await writeAuditLog({
      actorUserId: row.userId,
      action: "auth.email_verified",
    });

    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    return jsonError(error);
  }
}
