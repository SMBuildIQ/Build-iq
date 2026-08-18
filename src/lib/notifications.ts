import { prisma } from "@/lib/db";

interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

export async function notifyUser(organizationId: string, userId: string, input: NotifyInput) {
  await prisma.notification.create({
    data: { organizationId, userId, ...input },
  });
}

/**
 * brief §19/§29: approvers should be notified when an approval is required, and
 * more generally purchasing events should reach the right people. Roles are
 * org-scoped, so "notify everyone holding this role" means everyone with a
 * MembershipRole pointing at that Role — across however many users hold it.
 */
export async function notifyRole(organizationId: string, roleKey: string, input: NotifyInput) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId, status: "active", roles: { some: { role: { key: roleKey } } } },
    select: { userId: true },
  });
  await Promise.all(memberships.map((m) => notifyUser(organizationId, m.userId, input)));
}
