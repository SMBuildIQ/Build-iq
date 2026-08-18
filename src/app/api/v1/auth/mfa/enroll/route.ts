import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { generateTotpSecret, buildTotpUri } from "@/lib/auth/mfa";
import { encryptSecret } from "@/lib/auth/crypto";

// Step 1 of enrollment: generate a new secret and hand back everything needed
// to add it to an authenticator app (QR code + the raw secret for manual
// entry). Nothing is "enabled" yet — mfaEnabled only flips true once
// POST /auth/mfa/verify proves the user can actually generate a valid code
// from what they just scanned, so a typo'd QR scan can never silently lock
// an account out of its own login.
export const POST = withAuth(async (_req, ctx) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });
  if (user.mfaEnabled) throw new ValidationError("MFA is already enabled — disable it first to re-enroll.");

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { mfaPendingSecret: encryptSecret(secret) } });

  const otpauthUrl = buildTotpUri(user.email, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({ secret, otpauthUrl, qrCodeDataUrl });
});
