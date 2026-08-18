import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withAuth, NotFoundError, ValidationError } from "@/lib/api/handler";
import { requirePermission } from "@/lib/permissions/check";
import { writeAuditLog } from "@/lib/audit";

const patchSchema = z.object({
  name: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(300),
  city: z.string().min(1).max(200),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(50).optional().nullable(),
  country: z.string().max(100).default("US"),
  isShipping: z.boolean().default(true),
  isBilling: z.boolean().default(false),
});

async function loadOwned(id: string, organizationId: string) {
  const location = await prisma.location.findFirst({ where: { id, organizationId } });
  if (!location) throw new NotFoundError("Location not found");
  return location;
}

export const PATCH = withAuth<{ id: string }>(async (req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_settings");
  const location = await loadOwned(id, ctx.organizationId);

  const body = patchSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) throw new ValidationError(JSON.stringify(body.error.flatten()));

  const updated = await prisma.location.update({ where: { id: location.id }, data: body.data });
  await writeAuditLog(ctx, {
    action: "location.update",
    entityType: "Location",
    entityId: location.id,
    before: { name: location.name },
    after: { name: body.data.name },
  });
  return NextResponse.json({ location: updated });
});

// Blocked (not cascaded) when a purchase request's delivery location or a
// member's default location still points here — see the matching comment on
// departments/[id]/route.ts.
export const DELETE = withAuth<{ id: string }>(async (_req, ctx, { id }) => {
  requirePermission(ctx, "org:manage_settings");
  const location = await loadOwned(id, ctx.organizationId);

  const [purchaseRequestCount, membershipCount] = await Promise.all([
    prisma.purchaseRequest.count({ where: { deliveryLocationId: location.id } }),
    prisma.membership.count({ where: { locationId: location.id } }),
  ]);
  const usageCount = purchaseRequestCount + membershipCount;
  if (usageCount > 0) {
    const parts: string[] = [];
    if (purchaseRequestCount > 0) parts.push(`${purchaseRequestCount} purchase request${purchaseRequestCount === 1 ? "" : "s"}`);
    if (membershipCount > 0) parts.push(`${membershipCount} member${membershipCount === 1 ? "" : "s"}`);
    throw new ValidationError(`Cannot delete "${location.name}" — it is used by ${parts.join(" and ")}`);
  }

  await prisma.location.delete({ where: { id: location.id } });
  await writeAuditLog(ctx, { action: "location.delete", entityType: "Location", entityId: location.id, before: { name: location.name } });
  return NextResponse.json({ ok: true });
});
