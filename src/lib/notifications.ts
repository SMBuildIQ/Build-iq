import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}

// KNOWN_LIMITATIONS.md flagged this as a real gap: notifications were in-app
// only, delivered by client-side polling, with no email/SMS channel at all —
// a user not actively looking at the app could miss a real purchasing event
// (an approval waiting on them, a discrepancy needing attention) entirely.
// The in-app Notification row is still the source of truth and always
// written first; email is best-effort on top of it via the same
// log-when-unconfigured sendEmail() used by RFQ send and negotiation send —
// a failed or unconfigured email must never prevent the in-app notification
// from existing. SMS is still not implemented (no SMS provider integrated).
export async function notifyUser(organizationId: string, userId: string, input: NotifyInput) {
  await prisma.notification.create({
    data: { organizationId, userId, ...input },
  });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return;
  try {
    await sendEmail({ to: user.email, subject: input.title, text: input.body ?? input.title, logPrefix: `notification:${input.type}` });
  } catch (err) {
    console.error(`Failed to email notification "${input.title}" to ${user.email}:`, err);
  }
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
