import { SignJWT, jwtVerify } from "jose";

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

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
