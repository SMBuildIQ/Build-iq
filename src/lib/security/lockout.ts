import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/** Progressive lockout after failed logins — persisted in DB. */
export async function recordFailedLogin(email: string) {
  const key = email.toLowerCase();
  const now = new Date();
  const existing = await prisma.loginAttempt.findUnique({ where: { email: key } });
  if (!existing || existing.windowStartsAt.getTime() + WINDOW_MS < now.getTime()) {
    await prisma.loginAttempt.upsert({
      where: { email: key },
      create: { email: key, failures: 1, windowStartsAt: now },
      update: { failures: 1, windowStartsAt: now, lockedUntil: null },
    });
    return { locked: false, remaining: MAX_ATTEMPTS - 1 };
  }

  const failures = existing.failures + 1;
  const lockedUntil =
    failures >= MAX_ATTEMPTS ? new Date(now.getTime() + WINDOW_MS) : existing.lockedUntil;

  await prisma.loginAttempt.update({
    where: { email: key },
    data: { failures, lockedUntil },
  });

  return {
    locked: Boolean(lockedUntil && lockedUntil > now),
    remaining: Math.max(0, MAX_ATTEMPTS - failures),
  };
}

export async function clearFailedLogins(email: string) {
  await prisma.loginAttempt
    .delete({ where: { email: email.toLowerCase() } })
    .catch(() => undefined);
}

export async function assertNotLocked(email: string) {
  const row = await prisma.loginAttempt.findUnique({ where: { email: email.toLowerCase() } });
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    const mins = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000);
    throw new LockoutError(`Account temporarily locked. Try again in ${mins} minute(s).`);
  }
}

export class LockoutError extends Error {
  status = 429;
  constructor(message: string) {
    super(message);
  }
}
