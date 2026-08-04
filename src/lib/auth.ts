import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE_NAME = "buildiq_session";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error("AUTH_SECRET must be a strong 32+ character secret in production");
    }
  }
  return new TextEncoder().encode(secret || "buildiq-dev-secret-change-me-now");
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  companyId: string;
  companyName: string;
  role: string;
  tokenVersion: number;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    companyId: user.companyId,
    companyName: user.companyName,
    role: user.role,
    tv: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

type JwtPayload = {
  id?: string;
  email?: string;
  name?: string;
  companyId?: string;
  companyName?: string;
  role?: string;
  tv?: number;
};

async function hydrateSession(payload: JwtPayload): Promise<SessionUser | null> {
  if (!payload.id || !payload.companyId) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      email: true,
      name: true,
      tokenVersion: true,
      deletedAt: true,
      emailVerifiedAt: true,
      memberships: {
        where: { companyId: payload.companyId },
        include: { company: true },
        take: 1,
      },
    },
  });

  if (!user || user.deletedAt) return null;
  const tokenVersion = typeof payload.tv === "number" ? payload.tv : 0;
  if (user.tokenVersion !== tokenVersion) return null;

  const membership = user.memberships[0];
  if (!membership) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
    tokenVersion: user.tokenVersion,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return hydrateSession(payload as JwtPayload);
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError("Unauthorized");
  return user;
}

export async function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return hydrateSession(payload as JwtPayload);
  } catch {
    return null;
  }
}

export class AuthError extends Error {
  status = 401;
  constructor(message = "Unauthorized") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden") {
    super(message);
  }
}

export function jsonError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof AuthError || error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error && typeof error === "object" && "status" in error && typeof (error as { status: unknown }).status === "number") {
    const e = error as { status: number; message?: string };
    return NextResponse.json({ error: e.message || fallback }, { status: e.status });
  }
  if (error && typeof error === "object" && "name" in error && (error as { name: string }).name === "ZodError") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  // Avoid leaking internal stack/messages in production
  if (process.env.NODE_ENV === "production") {
    console.error("[api]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: fallback }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function ensureOwnedProject(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
  });
  if (!project) throw new Error("Project not found");
  return project;
}

export function slugifyCompany(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "builder";
}

export async function uniqueCompanySlug(name: string) {
  const base = slugifyCompany(name);
  let slug = base;
  let i = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function sessionFromMembership(userId: string, companyId?: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { company: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user?.memberships.length) return null;
  const membership =
    (companyId && user.memberships.find((m) => m.companyId === companyId)) || user.memberships[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    companyId: membership.companyId,
    companyName: membership.company.name,
    role: membership.role,
    tokenVersion: user.tokenVersion,
  };
}

/** Invalidate all JWTs for a user (call before password change or sensitive ops). */
export async function bumpTokenVersion(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}
