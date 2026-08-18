import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signSession } from "./session";
import { setSessionCookie } from "./cookies";

/**
 * Shared by POST /auth/login (no MFA, or MFA already satisfied) and
 * POST /auth/mfa/challenge (MFA satisfied) — the "user has proven who they
 * are, now give them a real session" step, so both call paths build the
 * exact same response shape and set the session cookie the same way.
 */
export async function establishSession(user: { id: string; tokenVersion: number; email: string; name: string }): Promise<NextResponse> {
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, status: "active" },
    orderBy: { createdAt: "asc" },
    include: { organization: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "This account has no active organization" }, { status: 403 });
  }

  const token = await signSession({
    userId: user.id,
    tokenVersion: user.tokenVersion,
    activeOrganizationId: membership.organizationId,
  });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    organization: { id: membership.organization.id, name: membership.organization.name, slug: membership.organization.slug },
  });
  setSessionCookie(res, token);
  return res;
}
