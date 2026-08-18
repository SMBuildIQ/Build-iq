import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signMfaChallenge } from "@/lib/auth/session";
import { establishSession } from "@/lib/auth/establishSession";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const email = body.data.email.toLowerCase();
  const ipAddress = req.headers.get("x-forwarded-for") ?? undefined;

  const recentFailures = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
  });
  if (recentFailures >= LOCKOUT_THRESHOLD) {
    return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && !user.deletedAt ? await verifyPassword(body.data.password, user.passwordHash) : false;

  await prisma.loginAttempt.create({
    data: { userId: user?.id, email, success: !!valid, ipAddress },
  });

  if (!valid || !user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (user.mfaEnabled) {
    // Password alone doesn't establish a session for an MFA-enrolled account —
    // this short-lived token only proves "the password was correct" and is
    // exchanged for a real session by POST /auth/mfa/challenge.
    const mfaToken = await signMfaChallenge(user.id);
    return NextResponse.json({ mfaRequired: true, mfaToken });
  }

  return establishSession(user);
}
