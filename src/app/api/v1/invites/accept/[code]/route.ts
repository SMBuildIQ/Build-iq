import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  password: z.string().min(1),
});

// Public, token-authenticated (the invite code is the credential) — the
// invitee has no session yet, so this can't go through withAuth. Handles both
// a brand-new user (name + password create the account) and an existing user
// joining a second organization (password only, verified against their
// existing hash) — brief §2: "A user may belong to more than one organization."
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({ where: { code } });
  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "This invite is no longer valid" }, { status: 404 });
  }

  const role = await prisma.role.findUnique({
    where: { organizationId_key: { organizationId: invite.organizationId, key: invite.roleKey } },
  });
  if (!role) {
    return NextResponse.json({ error: "The invited role no longer exists" }, { status: 400 });
  }

  let user = await prisma.user.findUnique({ where: { email: invite.email } });

  if (user) {
    const valid = await verifyPassword(body.data.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password for the existing account with this email" }, { status: 401 });
    }
  } else {
    if (!body.data.name || body.data.password.length < 10) {
      return NextResponse.json({ error: "name is required and password must be 10+ characters for a new account" }, { status: 400 });
    }
    user = await prisma.user.create({
      data: { email: invite.email, name: body.data.name, passwordHash: await hashPassword(body.data.password) },
    });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: invite.organizationId } },
  });

  await prisma.$transaction(async (tx) => {
    if (!existingMembership) {
      await tx.membership.create({
        data: {
          userId: user!.id,
          organizationId: invite.organizationId,
          status: "active",
          roles: { create: [{ roleId: role.id }] },
        },
      });
    } else {
      await tx.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId: existingMembership.id, roleId: role.id } },
        create: { membershipId: existingMembership.id, roleId: role.id },
        update: {},
      });
    }
    await tx.invite.update({ where: { id: invite.id }, data: { status: "accepted" } });
  });

  const token = await signSession({
    userId: user.id,
    tokenVersion: user.tokenVersion,
    activeOrganizationId: invite.organizationId,
  });

  const res = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
  setSessionCookie(res, token);
  return res;
}
