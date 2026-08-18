import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";
import { evaluatePurchasePolicy, createApprovalRequest, canNegotiateAutonomously } from "../src/lib/policy/engine";

async function makeOrg() {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `policy-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Policy Test User" },
  });
  return createOrganizationWithOwner({ name: `Policy Org ${suffix}`, slug: `policy-org-${suffix}`, ownerUserId: user.id });
}

// The starter policy seeded by createOrganizationWithOwner mirrors brief §18's
// worked examples exactly, so these assertions double as a spec check on that
// seed data, not just on the evaluator.

test("a $500 purchase requires only department manager approval", async () => {
  const { organization } = await makeOrg();
  const result = await evaluatePurchasePolicy({ organizationId: organization.id, amount: 500 });
  assert.deepEqual(result.requiredApprovals.map((a) => a.roleKey), ["department_manager"]);
  assert.equal(result.minimumBidsRequired, null);
});

test("a $30,000 purchase requires purchasing director approval and 3 bids", async () => {
  const { organization } = await makeOrg();
  const result = await evaluatePurchasePolicy({ organizationId: organization.id, amount: 30_000 });
  assert.deepEqual(result.requiredApprovals.map((a) => a.roleKey), ["purchasing_director"]);
  assert.equal(result.minimumBidsRequired, 3);
});

test("a $300,000 purchase requires CFO approval", async () => {
  const { organization } = await makeOrg();
  const result = await evaluatePurchasePolicy({ organizationId: organization.id, amount: 300_000 });
  assert.deepEqual(result.requiredApprovals.map((a) => a.roleKey), ["cfo"]);
});

test("a product substitution always adds a buyer approval requirement", async () => {
  const { organization } = await makeOrg();
  const result = await evaluatePurchasePolicy({ organizationId: organization.id, amount: 500, hasSubstitution: true });
  assert.ok(result.requiredApprovals.some((a) => a.roleKey === "buyer"));
});

test("createApprovalRequest persists one ApprovalStep per required approval, in order", async () => {
  const { organization, membership } = await makeOrg();
  const pr = await prisma.purchaseRequest.create({
    data: {
      organizationId: organization.id,
      requestNumber: `PR-${randomUUID().slice(0, 8)}`,
      requesterId: membership.userId,
      title: "Test purchase",
      status: "under_review",
    },
  });

  const evaluation = await evaluatePurchasePolicy({ organizationId: organization.id, amount: 60_000 });
  const approvalRequest = await createApprovalRequest({
    organizationId: organization.id,
    purchaseRequestId: pr.id,
    amount: 60_000,
    evaluation,
  });

  assert.ok(approvalRequest);
  assert.equal(approvalRequest!.steps.length, evaluation.requiredApprovals.length);
  assert.deepEqual(
    approvalRequest!.steps.map((s) => s.sequence),
    approvalRequest!.steps.map((_, i) => i + 1)
  );
});

test("AI negotiation authority is denied by default until an org explicitly enables it", async () => {
  const { organization } = await makeOrg();
  const allowed = await canNegotiateAutonomously(organization.id, 5000);
  assert.equal(allowed, false, "autoNegotiateEnabled defaults to false — no org gets silent autonomy");
});

test("AI negotiation authority respects the configured maximum purchase value", async () => {
  const { organization } = await makeOrg();
  await prisma.negotiationAuthority.updateMany({
    where: { organizationId: organization.id },
    data: { autoNegotiateEnabled: true, maxPurchaseValue: 10_000 },
  });
  assert.equal(await canNegotiateAutonomously(organization.id, 9_999), true);
  assert.equal(await canNegotiateAutonomously(organization.id, 10_001), false);
});
