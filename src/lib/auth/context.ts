import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "./session";
import type { PermissionKey } from "@/lib/permissions/catalog";

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationSlug: string;
  organizationRequireMfa: boolean;
  mfaEnabled: boolean;
  membershipId: string;
  roleKeys: string[];
  permissions: Set<PermissionKey>;
}

/**
 * Resolves the full request-scoped auth + tenant context from the session cookie.
 * Returns null if there is no valid session, the session references a revoked
 * token version, or the active organization has no membership for this user —
 * callers must treat null as "not authenticated for any tenant."
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload || !payload.activeOrganizationId) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.deletedAt || user.tokenVersion !== payload.tokenVersion) return null;

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: payload.activeOrganizationId } },
    include: {
      organization: true,
      roles: { include: { role: { include: { permissions: true } } } },
    },
  });
  if (!membership || membership.status !== "active") return null;

  const permissions = new Set<PermissionKey>();
  const roleKeys: string[] = [];
  for (const mr of membership.roles) {
    roleKeys.push(mr.role.key);
    for (const rp of mr.role.permissions) {
      permissions.add(rp.permissionKey as PermissionKey);
    }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: membership.organizationId,
    organizationSlug: membership.organization.slug,
    organizationRequireMfa: membership.organization.requireMfa,
    mfaEnabled: user.mfaEnabled,
    membershipId: membership.id,
    roleKeys,
    permissions,
  };
}
