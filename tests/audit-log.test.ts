import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { writeAuditLog, writeSystemAuditLog } from "../src/lib/audit";
import type { AuthContext } from "../src/lib/auth/context";

// brief §28: "Who did what, when, why, and based on what information?" Every
// mutating route calls through here, but nothing asserted the log rows it
// actually produces — flagged in this session's own progress audit.

async function makeCtx(): Promise<AuthContext> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `audit-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Audit Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Audit Org ${suffix}`, slug: `audit-org-${suffix}`, ownerUserId: user.id });
  const membership = await prisma.membership.findFirstOrThrow({ where: { organizationId: organization.id, userId: user.id } });
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    membershipId: membership.id,
    roleKeys: ["company_owner"],
    permissions: new Set(),
  };
}

test("writeAuditLog records the actor, action, entity, and org exactly as given", async () => {
  const ctx = await makeCtx();
  const entityId = randomUUID();
  await writeAuditLog(ctx, {
    action: "purchase_request.approve",
    entityType: "PurchaseRequest",
    entityId,
    ipAddress: "203.0.113.5",
    userAgent: "test-agent/1.0",
  });

  const log = await prisma.auditLog.findFirst({ where: { entityId } });
  assert.ok(log);
  assert.equal(log!.organizationId, ctx.organizationId);
  assert.equal(log!.actorUserId, ctx.userId);
  assert.equal(log!.actorType, "user");
  assert.equal(log!.action, "purchase_request.approve");
  assert.equal(log!.entityType, "PurchaseRequest");
  assert.equal(log!.ipAddress, "203.0.113.5");
  assert.equal(log!.userAgent, "test-agent/1.0");
});

test("before/after are JSON-serialized and round-trip the original values", async () => {
  const ctx = await makeCtx();
  const entityId = randomUUID();
  await writeAuditLog(ctx, {
    action: "purchase_order.status_change",
    entityType: "PurchaseOrder",
    entityId,
    before: { status: "issued", total: 950 },
    after: { status: "shipped", total: 950 },
  });

  const log = await prisma.auditLog.findFirst({ where: { entityId } });
  assert.ok(log);
  assert.deepEqual(JSON.parse(log!.before!), { status: "issued", total: 950 });
  assert.deepEqual(JSON.parse(log!.after!), { status: "shipped", total: 950 });
});

test("omitting before/after leaves them null rather than serializing undefined", async () => {
  const ctx = await makeCtx();
  const entityId = randomUUID();
  await writeAuditLog(ctx, { action: "supplier.create", entityType: "Supplier", entityId });

  const log = await prisma.auditLog.findFirst({ where: { entityId } });
  assert.equal(log!.before, null);
  assert.equal(log!.after, null);
});

test("a falsy but explicit after value (0, false, empty object) is still recorded, not treated as omitted", async () => {
  const ctx = await makeCtx();
  const entityId = randomUUID();
  await writeAuditLog(ctx, { action: "savings.recompute", entityType: "SavingsRecord", entityId, after: 0 });

  const log = await prisma.auditLog.findFirst({ where: { entityId } });
  assert.equal(log!.after, "0"); // JSON.stringify(0) — present, not null
});

test("writeSystemAuditLog records no human actor and the given system/ai actorType", async () => {
  const ctx = await makeCtx();
  const entityId = randomUUID();
  await writeSystemAuditLog(ctx.organizationId, "ai", { action: "quote_recommendation.generated", entityType: "PurchaseRequest", entityId });

  const log = await prisma.auditLog.findFirst({ where: { entityId } });
  assert.ok(log);
  assert.equal(log!.actorUserId, null);
  assert.equal(log!.actorType, "ai");
  assert.equal(log!.organizationId, ctx.organizationId);
});

test("audit logs are strictly scoped per organization", async () => {
  const ctxA = await makeCtx();
  const ctxB = await makeCtx();
  const entityId = randomUUID();
  await writeAuditLog(ctxA, { action: "purchase_request.create", entityType: "PurchaseRequest", entityId });

  const visibleToA = await prisma.auditLog.findFirst({ where: { entityId, organizationId: ctxA.organizationId } });
  const visibleToB = await prisma.auditLog.findFirst({ where: { entityId, organizationId: ctxB.organizationId } });
  assert.ok(visibleToA);
  assert.equal(visibleToB, null);
});
