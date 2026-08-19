import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ROLES } from "../src/lib/permissions/catalog";
import { hasPermission, requirePermission, ForbiddenError } from "../src/lib/permissions/check";
import type { AuthContext } from "../src/lib/auth/context";

function fakeCtx(roleKey: string): AuthContext {
  const role = DEFAULT_ROLES.find((r) => r.key === roleKey);
  if (!role) throw new Error(`no such default role: ${roleKey}`);
  return {
    userId: "u1",
    email: "u1@example.com",
    name: "Test User",
    organizationId: "org1",
    organizationSlug: "org1",
    organizationRequireMfa: false,
    mfaEnabled: false,
    membershipId: "m1",
    roleKeys: [role.key],
    permissions: new Set(role.permissions),
  };
}

test("Viewer role cannot create purchase requests", () => {
  const ctx = fakeCtx("viewer");
  assert.equal(hasPermission(ctx, "purchase_request:create"), false);
  assert.throws(() => requirePermission(ctx, "purchase_request:create"), ForbiddenError);
});

test("Viewer role can view purchase requests", () => {
  const ctx = fakeCtx("viewer");
  assert.equal(hasPermission(ctx, "purchase_request:view"), true);
});

test("Receiving/Warehouse role can record receipts but not issue purchase orders", () => {
  const ctx = fakeCtx("receiving");
  assert.equal(hasPermission(ctx, "receiving:record"), true);
  assert.equal(hasPermission(ctx, "purchase_order:issue"), false);
});

test("Company Owner holds every permission in the catalog", () => {
  const ctx = fakeCtx("company_owner");
  const buyerCtx = fakeCtx("buyer");
  for (const permission of buyerCtx.permissions) {
    assert.equal(hasPermission(ctx, permission), true);
  }
});

test("Buyer can create RFQs and negotiate but cannot decide approvals", () => {
  const ctx = fakeCtx("buyer");
  assert.equal(hasPermission(ctx, "rfq:create"), true);
  assert.equal(hasPermission(ctx, "negotiation:initiate"), true);
  assert.equal(hasPermission(ctx, "approval:decide"), false);
});
