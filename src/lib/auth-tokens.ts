import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export type AuthTokenType = "EMAIL_VERIFY" | "PASSWORD_RESET";

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueAuthToken(userId: string, type: AuthTokenType, ttlMinutes = 60) {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  // Invalidate prior unused tokens of this type
  await prisma.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.authToken.create({
    data: { userId, type, tokenHash, expiresAt },
  });

  return { raw, expiresAt };
}

export async function consumeAuthToken(raw: string, type: AuthTokenType) {
  const tokenHash = hashToken(raw);
  const row = await prisma.authToken.findUnique({ where: { tokenHash } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return row;
}
