import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { verifyPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ password: z.string().min(1) });

// Requires the current password, not just an active session — MFA exists
// specifically to protect against a compromised session/device, so turning
// it off must not be possible from a hijacked session alone.
export const POST = withAuth(async (req, ctx) => {
  if (ctx.organizationRequireMfa) {
    throw new ValidationError("Your organization requires two-factor authentication — it cannot be disabled.");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId } });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("password is required");

  const valid = await verifyPassword(body.data.password, user.passwordHash);
  if (!valid) throw new ValidationError("Incorrect password");

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null, mfaPendingSecret: null } }),
    prisma.mfaBackupCode.deleteMany({ where: { userId: user.id } }),
  ]);

  await writeAuditLog(ctx, { action: "user.mfa_disabled", entityType: "User", entityId: user.id, after: {} });

  return NextResponse.json({ enabled: false });
});
