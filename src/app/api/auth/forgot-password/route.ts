import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/auth";
import { issueAuthToken } from "@/lib/auth-tokens";
import { appBaseUrl, sendEmail } from "@/lib/email";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
});

/** Request a password-reset email. Always returns ok to avoid email enumeration. */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && !user.deletedAt) {
      const { raw } = await issueAuthToken(user.id, "PASSWORD_RESET", 60);
      const link = `${appBaseUrl()}/reset-password?token=${raw}`;
      await sendEmail({
        to: email,
        subject: "Reset your BuildIQ password",
        text: `Reset your password using this link (expires in 60 minutes):\n\n${link}\n\nIf you did not request this, ignore this email.`,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
