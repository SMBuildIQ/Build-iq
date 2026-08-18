import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";

// Exercises the exact query shape every tenant-scoped route handler uses
// (findFirst({ where: { id, organizationId } })) to prove a record from one
// organization is genuinely unreachable from another — not just hidden by a
// list filter. See src/lib/api/handler.ts and any src/app/api/v1/**/[id]/route.ts.

async function makeOrg(label: string) {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `${label}-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: label },
  });
  const { organization } = await createOrganizationWithOwner({
    name: `${label} ${suffix}`,
    slug: `${label}-${suffix}`,
    ownerUserId: user.id,
  });
  return { user, organization };
}

test("a purchase request created in org A is not reachable via org B's tenant-scoped query", async () => {
  const orgA = await makeOrg("tenant-a");
  const orgB = await makeOrg("tenant-b");

  const pr = await prisma.purchaseRequest.create({
    data: {
      organizationId: orgA.organization.id,
      requestNumber: `PR-${randomUUID().slice(0, 8)}`,
      requesterId: orgA.user.id,
      title: "Confidential purchase for org A",
      status: "draft",
    },
  });

  const foundByOwner = await prisma.purchaseRequest.findFirst({
    where: { id: pr.id, organizationId: orgA.organization.id },
  });
  assert.ok(foundByOwner, "the owning organization must see its own record");

  const foundByOther = await prisma.purchaseRequest.findFirst({
    where: { id: pr.id, organizationId: orgB.organization.id },
  });
  assert.equal(foundByOther, null, "a different organization must not be able to load the record by id");

  const listForOther = await prisma.purchaseRequest.findMany({ where: { organizationId: orgB.organization.id } });
  assert.equal(
    listForOther.find((r) => r.id === pr.id),
    undefined,
    "org B's list query must never include org A's purchase request"
  );
});

test("a supplier created in org A is not reachable via org B's tenant-scoped query", async () => {
  const orgA = await makeOrg("tenant-sup-a");
  const orgB = await makeOrg("tenant-sup-b");

  const supplier = await prisma.supplier.create({
    data: { organizationId: orgA.organization.id, name: "Org A Only Supplier" },
  });

  const crossTenant = await prisma.supplier.findFirst({
    where: { id: supplier.id, organizationId: orgB.organization.id },
  });
  assert.equal(crossTenant, null);
});

test("verifyEntityOwnership rejects a purchase request id that belongs to a different org", async () => {
  const { verifyEntityOwnership } = await import("../src/lib/documents/entityOwnership");
  const orgA = await makeOrg("doc-tenant-a");
  const orgB = await makeOrg("doc-tenant-b");

  const pr = await prisma.purchaseRequest.create({
    data: {
      organizationId: orgA.organization.id,
      requestNumber: `PR-${randomUUID().slice(0, 8)}`,
      requesterId: orgA.user.id,
      title: "Org A purchase",
      status: "draft",
    },
  });

  assert.equal(await verifyEntityOwnership(orgA.organization.id, "purchase_request", pr.id), true);
  assert.equal(await verifyEntityOwnership(orgB.organization.id, "purchase_request", pr.id), false);
});

test("membership + role lookups are scoped per organization, not global to the user", async () => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `multi-org-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Multi Org User" },
  });
  const { organization: orgA } = await createOrganizationWithOwner({ name: `A ${suffix}`, slug: `a-${suffix}`, ownerUserId: user.id });
  const { organization: orgB } = await createOrganizationWithOwner({ name: `B ${suffix}`, slug: `b-${suffix}`, ownerUserId: user.id });

  const membershipA = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgA.id } },
    include: { roles: { include: { role: true } } },
  });
  const membershipB = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: orgB.id } },
    include: { roles: { include: { role: true } } },
  });

  assert.ok(membershipA && membershipB);
  assert.notEqual(membershipA!.id, membershipB!.id, "the same user has independent memberships per organization");
  // Roles are org-scoped rows (Role.organizationId), so the role granting company_owner
  // in org A must be a different database row than the one in org B.
  assert.notEqual(membershipA!.roles[0].role.id, membershipB!.roles[0].role.id);
});
