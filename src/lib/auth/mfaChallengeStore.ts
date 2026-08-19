import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

// Deliberately separate from session.ts, which stays Prisma-free — the jti
// itself is minted/verified there, this module only records that one has
// been spent. See MfaChallengeUse in prisma/schema.prisma.

/**
 * Atomically claims a jti for one-time use. Returns true the first time a
 * given jti is consumed, false on every subsequent call — a unique-constraint
 * violation at the database level, not a check-then-act race in application
 * code, so two concurrent requests racing the same stolen mfaToken can't both
 * win.
 */
export async function consumeMfaChallenge(jti: string): Promise<boolean> {
  try {
    await prisma.mfaChallengeUse.create({ data: { jti } });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}
