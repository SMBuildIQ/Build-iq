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
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
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

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.companyId) return null;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      companyId: payload.companyId as string,
      companyName: (payload.companyName as string) || "",
      role: (payload.role as string) || "OWNER",
    };
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
    if (!payload.companyId) return null;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      companyId: payload.companyId as string,
      companyName: (payload.companyName as string) || "",
      role: (payload.role as string) || "OWNER",
    };
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

export function jsonError(error: unknown, fallback = "Something went wrong") {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
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
  };
}
