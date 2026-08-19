import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({ requireMfa: z.boolean() });

// Org-wide settings that aren't tied to a specific module (locations,
// departments, policy rules, etc. all have their own routes already).
// requireMfa is the first field exposed here — see src/lib/auth/mfaPolicy.ts.
export const PATCH = withAuth(async (req, ctx) => {
  requirePermission(ctx, "org:manage_settings");

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError("requireMfa (boolean) is required");

  const before = await prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } });
  const organization = await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { requireMfa: body.data.requireMfa },
  });

  await writeAuditLog(ctx, {
    action: "organization.update_settings",
    entityType: "Organization",
    entityId: organization.id,
    before: { requireMfa: before.requireMfa },
    after: { requireMfa: organization.requireMfa },
  });

  return NextResponse.json({ organization });
});
