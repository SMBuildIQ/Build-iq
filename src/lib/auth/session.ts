import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

const SESSION_COOKIE = "buildiq_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a string of 32+ characters");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  tokenVersion: number;
  // Active org the session is scoped to. A user with multiple memberships
  // switches this via POST /api/v1/auth/switch-organization.
  activeOrganizationId: string | null;
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string" || typeof payload.tokenVersion !== "number") {
      return null;
    }
    return {
      userId: payload.userId,
      tokenVersion: payload.tokenVersion,
      activeOrganizationId:
        typeof payload.activeOrganizationId === "string" ? payload.activeOrganizationId : null,
    };
  } catch {
    return null;
  }
}

const MFA_CHALLENGE_TTL_SECONDS = 5 * 60; // short-lived — this token only proves "password was correct", not identity

/**
 * Issued after a correct password when the account has MFA enabled, in place
 * of a real session — carries no tokenVersion/activeOrganizationId, so even
 * if verifySession's shape checks were ever loosened, this token could not be
 * mistaken for (or reused as) a full session token; a distinct `purpose`
 * claim makes the two unambiguous regardless. Carries a random `jti` so the
 * caller (POST /auth/mfa/challenge, via consumeMfaChallenge in
 * mfaChallengeStore.ts — kept out of this file so session.ts stays
 * Prisma-free) can enforce single-use: a signed JWT is verifiable but not,
 * on its own, revocable or one-shot, so without a tracked jti this token
 * could otherwise be replayed against the challenge endpoint as many times
 * as its 5-minute TTL allows.
 */
export async function signMfaChallenge(userId: string): Promise<string> {
  return new SignJWT({ userId, purpose: "mfa_pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setJti(randomUUID())
    .setExpirationTime(`${MFA_CHALLENGE_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifyMfaChallenge(token: string): Promise<{ userId: string; jti: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.purpose !== "mfa_pending" || typeof payload.userId !== "string" || typeof payload.jti !== "string") return null;
    return { userId: payload.userId, jti: payload.jti };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
