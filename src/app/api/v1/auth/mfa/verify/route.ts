import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { verifyTotpCode, generateBackupCodes, hashBackupCode } from "@/lib/auth/mfa";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ code: z.string().min(1) });

// Step 2 of enrollment: proves the user can generate a valid code from the
// secret POST /auth/mfa/enroll issued, then — and only then — actually turns
// MFA on and issues one-time backup codes (shown once here, never again).
export const POST = withAuth(async (req, ctx) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (!user.mfaPendingSecret) throw new ValidationError("No MFA enrollment in progress — call /auth/mfa/enroll first.");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("code is required");

  const pendingSecret = decryptSecret(user.mfaPendingSecret);
  if (!verifyTotpCode(pendingSecret, body.data.code)) {
    throw new ValidationError("That code doesn't match — check your authenticator app and try again.");
  }

  const backupCodes = generateBackupCodes();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true, mfaSecret: encryptSecret(pendingSecret), mfaPendingSecret: null },
    }),
    prisma.mfaBackupCode.deleteMany({ where: { userId: user.id } }), // clear any codes from a prior enrollment
    prisma.mfaBackupCode.createMany({
      data: backupCodes.map((code) => ({ userId: user.id, codeHash: hashBackupCode(code) })),
    }),
  ]);

  await writeAuditLog(ctx, { action: "user.mfa_enabled", entityType: "User", entityId: user.id, after: {} });

  return NextResponse.json({ enabled: true, backupCodes });
});
