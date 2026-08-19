import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { notifyRole, notifyUser } from "../src/lib/notifications";
import { evaluatePurchasePolicy, createApprovalRequest } from "../src/lib/policy/engine";

test("notifyRole notifies every user holding that role in the organization", async () => {
  const suffix = randomUUID().slice(0, 8);
  const owner = await prisma.user.create({
    data: { email: `notif-owner-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Owner" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Notif Org ${suffix}`, slug: `notif-org-${suffix}`, ownerUserId: owner.id });

  await notifyRole(organization.id, "company_owner", { type: "test", title: "Hello owners" });

  const notifications = await prisma.notification.findMany({ where: { organizationId: organization.id, userId: owner.id } });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].title, "Hello owners");
  assert.equal(notifications[0].readAt, null);
});

test("notifyRole notifies nobody when no membership holds that role", async () => {
  const suffix = randomUUID().slice(0, 8);
  const owner = await prisma.user.create({
    data: { email: `notif-owner2-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Owner" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Notif Org2 ${suffix}`, slug: `notif-org2-${suffix}`, ownerUserId: owner.id });

  await notifyRole(organization.id, "cfo", { type: "test", title: "Nobody should get this" });

  const notifications = await prisma.notification.findMany({ where: { organizationId: organization.id, title: "Nobody should get this" } });
  assert.equal(notifications.length, 0);
});

test("creating an approval request notifies every unique required approver role", async () => {
  const suffix = randomUUID().slice(0, 8);
  const owner = await prisma.user.create({
    data: { email: `notif-approval-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Owner" },
  });
  const { organization, membership } = await createOrganizationWithOwner({
    name: `Notif Approval Org ${suffix}`,
    slug: `notif-approval-org-${suffix}`,
    ownerUserId: owner.id,
  });
  const pr = await prisma.purchaseRequest.create({
    data: {
      organizationId: organization.id,
      requestNumber: `PR-${suffix}`,
      requesterId: membership.userId,
      title: "Notif test purchase",
      status: "under_review",
    },
  });

  const evaluation = await evaluatePurchasePolicy({ organizationId: organization.id, amount: 60_000 });
  await createApprovalRequest({ organizationId: organization.id, purchaseRequestId: pr.id, amount: 60_000, evaluation });

  // The seeded policy routes $60,000 to cfo (the $50k-$250k band), which
  // nobody but the owner (company_owner) holds fresh out of signup —
  // notifyRole must not silently notify the owner as a fallback, so nobody
  // gets notified yet.
  const beforeAssignment = await prisma.notification.findMany({ where: { organizationId: organization.id, type: "approval_required" } });
  assert.equal(beforeAssignment.length, 0);

  // Once the owner is also granted the cfo role, the exact same evaluation
  // should reach them.
  const cfoRole = await prisma.role.findFirstOrThrow({ where: { organizationId: organization.id, key: "cfo" } });
  await prisma.membershipRole.create({ data: { membershipId: membership.id, roleId: cfoRole.id } });

  await createApprovalRequest({ organizationId: organization.id, purchaseRequestId: pr.id, amount: 60_000, evaluation });
  const afterAssignment = await prisma.notification.findMany({ where: { organizationId: organization.id, userId: owner.id, type: "approval_required" } });
  assert.equal(afterAssignment.length, 1);
});

test("notifyUser also emails the notification (logged, not sent, since RESEND_API_KEY isn't configured in tests)", async (t) => {
  const suffix = randomUUID().slice(0, 8);
  const email = `notif-email-${suffix}@example.com`;
  const owner = await prisma.user.create({
    data: { email, passwordHash: await hashPassword("password123!"), name: "Owner" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Notif Email Org ${suffix}`, slug: `notif-email-org-${suffix}`, ownerUserId: owner.id });

  const logSpy = t.mock.method(console, "log");
  await notifyUser(organization.id, owner.id, { type: "test", title: "Approval needed", body: "PR-1001 needs your review" });

  const emailLog = logSpy.mock.calls.map((c) => String(c.arguments[0])).find((line) => line.includes("would email"));
  assert.ok(emailLog, "expected a 'would email' log line");
  assert.match(emailLog!, new RegExp(email.replace(/[.+]/g, "\\$&")));
  assert.match(emailLog!, /Approval needed/);
  assert.match(emailLog!, /PR-1001 needs your review/);
});

test("notifyUser still writes the in-app notification even though email is only best-effort", async () => {
  // The in-app row is created before the email attempt and is the source of
  // truth regardless of email outcome — this asserts the ordering/independence
  // rather than mocking a failure, since sendEmail has no dependency-injection
  // seam and a real network failure isn't reproducible hermetically here.
  const suffix = randomUUID().slice(0, 8);
  const owner = await prisma.user.create({
    data: { email: `notif-independent-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Owner" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Notif Independent Org ${suffix}`, slug: `notif-independent-org-${suffix}`, ownerUserId: owner.id });

  await notifyUser(organization.id, owner.id, { type: "test", title: "Independent of email" });
  const notifications = await prisma.notification.findMany({ where: { organizationId: organization.id, userId: owner.id, title: "Independent of email" } });
  assert.equal(notifications.length, 1);
});
