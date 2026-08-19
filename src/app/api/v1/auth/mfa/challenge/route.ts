import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyMfaChallenge } from "@/lib/auth/session";
import { consumeMfaChallenge } from "@/lib/auth/mfaChallengeStore";
import { establishSession } from "@/lib/auth/establishSession";
import { decryptSecret } from "@/lib/auth/crypto";
import { verifyTotpCode, hashBackupCode } from "@/lib/auth/mfa";

const schema = z.object({ mfaToken: z.string(), code: z.string().min(1) });

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;

// The second step of login for an MFA-enrolled account — exchanges the
// short-lived mfaToken from POST /auth/login (proof the password was
// correct) plus a TOTP or backup code for a real session. Public: there is
// no session yet at this point, same as /auth/login itself.
export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const challenge = await verifyMfaChallenge(body.data.mfaToken);
  if (!challenge) return NextResponse.json({ error: "This verification step has expired — please sign in again." }, { status: 401 });

  // Burned on the first attempt against this mfaToken, win or lose — a
  // signed JWT is verifiable but not otherwise revocable, so without this
  // the token would stay replayable against this endpoint for its whole
  // 5-minute TTL instead of granting exactly one guess. Same "expired"
  // message as an actually-expired token: no separate signal for an
  // attacker replaying a captured one.
  const firstUse = await consumeMfaChallenge(challenge.jti);
  if (!firstUse) return NextResponse.json({ error: "This verification step has expired — please sign in again." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user || user.deletedAt || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  // Same brute-force lockout as password attempts, keyed by the same email —
  // a 6-digit TOTP code is only ~1M combinations, so this endpoint needs the
  // same protection or MFA adds no real defense against a guessing attack.
  const recentFailures = await prisma.loginAttempt.count({
    where: { email: user.email, success: false, createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
  });
  if (recentFailures >= LOCKOUT_THRESHOLD) {
    return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429 });
  }

  const totpValid = verifyTotpCode(decryptSecret(user.mfaSecret), body.data.code);
  let backupCodeUsedId: string | null = null;

  if (!totpValid) {
    const candidateHash = hashBackupCode(body.data.code);
    const backupCode = await prisma.mfaBackupCode.findFirst({
      where: { userId: user.id, codeHash: candidateHash, usedAt: null },
    });
    if (backupCode) backupCodeUsedId = backupCode.id;
  }

  const valid = totpValid || !!backupCodeUsedId;

  await prisma.loginAttempt.create({
    data: { userId: user.id, email: user.email, success: valid, ipAddress: req.headers.get("x-forwarded-for") ?? undefined },
  });

  if (!valid) {
    return NextResponse.json({ error: "Invalid verification code" }, { status: 401 });
  }

  if (backupCodeUsedId) {
    // Single-use — a leaked or reused backup code must not grant repeated access.
    await prisma.mfaBackupCode.update({ where: { id: backupCodeUsedId }, data: { usedAt: new Date() } });
  }

  return establishSession(user);
}
