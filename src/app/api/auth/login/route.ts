import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSessionToken,
  jsonError,
  sessionFromMembership,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { assertNotLocked, clearFailedLogins, recordFailedLogin, LockoutError } from "@/lib/security/lockout";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  companyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();

    await assertNotLocked(email);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });

    if (!user || user.deletedAt || !(await verifyPassword(body.password, user.passwordHash))) {
      await recordFailedLogin(email);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!user.memberships.length) {
      return NextResponse.json({ error: "No builder company linked to this account" }, { status: 403 });
    }

    await clearFailedLogins(email);

    const session = await sessionFromMembership(user.id, body.companyId);
    if (!session) {
      return NextResponse.json({ error: "Unable to load builder workspace" }, { status: 403 });
    }

    await setSessionCookie(await createSessionToken(session));
    await writeAuditLog({
      companyId: session.companyId,
      actorUserId: session.id,
      action: "auth.login",
      ip: req.headers.get("x-forwarded-for"),
    });

    return NextResponse.json({
      user: session,
      emailVerified: Boolean(user.emailVerifiedAt),
    });
  } catch (error) {
    if (error instanceof LockoutError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return jsonError(error);
  }
}
