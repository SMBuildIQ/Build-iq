import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_THRESHOLD = 5;

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const email = body.data.email.toLowerCase();
  const ipAddress = req.headers.get("x-forwarded-for") ?? undefined;

  const recentFailures = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) } },
  });
  if (recentFailures >= LOCKOUT_THRESHOLD) {
    return NextResponse.json({ error: "Too many failed attempts. Try again later." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && !user.deletedAt ? await verifyPassword(body.data.password, user.passwordHash) : false;

  await prisma.loginAttempt.create({
    data: { userId: user?.id, email, success: !!valid, ipAddress },
  });

  if (!valid || !user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

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
