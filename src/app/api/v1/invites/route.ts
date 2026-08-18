import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const schema = z.object({
  email: z.string().email(),
  roleKey: z.string(),
});

export const GET = withAuth(async (_req, ctx) => {
  requirePermission(ctx, "org:manage_users");
  const invites = await prisma.invite.findMany({
    where: { organizationId: ctx.organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invites });
});

// brief §2/§3: this is how an organization actually grows past its owner — every
// other role only becomes usable once someone can be invited into it.
export const POST = withAuth(async (req, ctx) => {
  requirePermission(ctx, "org:manage_users");

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("email and roleKey are required");
  const email = body.data.email.toLowerCase();

  const role = await prisma.role.findUnique({
    where: { organizationId_key: { organizationId: ctx.organizationId, key: body.data.roleKey } },
  });
  if (!role) throw new ValidationError(`Unknown role: ${body.data.roleKey}`);

  const existingMembership = await prisma.membership.findFirst({
    where: { organizationId: ctx.organizationId, status: "active", user: { email } },
  });
  if (existingMembership) throw new ValidationError("This email is already a member of your organization");

  await prisma.invite.updateMany({
    where: { organizationId: ctx.organizationId, email, status: "pending" },
    data: { status: "revoked" },
  });

  const invite = await prisma.invite.create({
    data: {
      organizationId: ctx.organizationId,
      email,
      code: randomBytes(24).toString("hex"),
      roleKey: role.key,
      invitedByUserId: ctx.userId,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await writeAuditLog(ctx, {
    action: "invite.create",
    entityType: "Invite",
    entityId: invite.id,
    after: { email, roleKey: role.key },
  });

  // No email provider is wired up for invite delivery yet — the invite link is
  // returned directly so it can be copied/shared, same honesty tradeoff as RFQ
  // send without RESEND_API_KEY (see KNOWN_LIMITATIONS.md).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return NextResponse.json({ invite, inviteUrl: `${appUrl}/invite/${invite.code}` }, { status: 201 });
});
