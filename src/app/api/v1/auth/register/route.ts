import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { createOrganizationWithOwner } from "@/lib/org/bootstrap";
import { slugify } from "@/lib/slug";

const schema = z.object({
  organizationName: z.string().min(2).max(200),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(10).max(200),
});

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "org";
  let candidate = root;
  let n = 1;
  while (await prisma.organization.findUnique({ where: { slug: candidate } })) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input", details: body.error.flatten() }, { status: 400 });
  }
  const { organizationName, name, email, password } = body.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, name },
  });

  const slug = await uniqueSlug(organizationName);
  const { organization } = await createOrganizationWithOwner({
    name: organizationName,
    slug,
    ownerUserId: user.id,
  });

  const token = await signSession({
    userId: user.id,
    tokenVersion: user.tokenVersion,
    activeOrganizationId: organization.id,
  });

  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
    organization: { id: organization.id, name: organization.name, slug: organization.slug },
  });
  setSessionCookie(res, token);
  return res;
}
