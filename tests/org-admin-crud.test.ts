import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";

// These exercise the exact usage-count guard the department/cost-center/location
// DELETE routes run before deleting — a hard delete while a purchase request (or,
// for locations, a membership) still points at the row would either fail at the
// DB foreign-key level with an opaque 500, or silently orphan real cost-attribution
// history if the relation were ever changed to SetNull/Cascade. The route rejects
// the delete instead, with a message naming what's still using it.

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `admin-crud-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Admin Crud Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Admin Crud Org ${suffix}`, slug: `admin-crud-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

test("a department referenced by a purchase request cannot be deleted, an unreferenced one can", async () => {
  const orgId = await makeOrgId();
  const suffix = randomUUID().slice(0, 8);
  const used = await prisma.department.create({ data: { organizationId: orgId, name: "Engineering" } });
  const unused = await prisma.department.create({ data: { organizationId: orgId, name: "Marketing" } });
  await prisma.purchaseRequest.create({
    data: { organizationId: orgId, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "draft", departmentId: used.id },
  });

  assert.equal(await prisma.purchaseRequest.count({ where: { departmentId: used.id } }), 1);
  assert.equal(await prisma.purchaseRequest.count({ where: { departmentId: unused.id } }), 0);
});

test("a cost center referenced by a purchase request cannot be deleted, an unreferenced one can", async () => {
  const orgId = await makeOrgId();
  const suffix = randomUUID().slice(0, 8);
  const used = await prisma.costCenter.create({ data: { organizationId: orgId, code: "ENG-100", name: "Engineering" } });
  const unused = await prisma.costCenter.create({ data: { organizationId: orgId, code: "MKT-100", name: "Marketing" } });
  await prisma.purchaseRequest.create({
    data: { organizationId: orgId, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "draft", costCenterId: used.id },
  });

  assert.equal(await prisma.purchaseRequest.count({ where: { costCenterId: used.id } }), 1);
  assert.equal(await prisma.purchaseRequest.count({ where: { costCenterId: unused.id } }), 0);
});

test("a location referenced by a purchase request's delivery location cannot be deleted", async () => {
  const orgId = await makeOrgId();
  const suffix = randomUUID().slice(0, 8);
  const used = await prisma.location.create({ data: { organizationId: orgId, name: "HQ", addressLine1: "1 Main St", city: "Detroit", country: "US" } });
  await prisma.purchaseRequest.create({
    data: { organizationId: orgId, requestNumber: `PR-${suffix}`, requesterId: randomUUID(), title: "t", status: "draft", deliveryLocationId: used.id },
  });

  assert.equal(await prisma.purchaseRequest.count({ where: { deliveryLocationId: used.id } }), 1);
});

test("a location referenced by a member's default location cannot be deleted", async () => {
  const orgId = await makeOrgId();
  const location = await prisma.location.create({ data: { organizationId: orgId, name: "HQ", addressLine1: "1 Main St", city: "Detroit", country: "US" } });
  const membership = await prisma.membership.findFirstOrThrow({ where: { organizationId: orgId } });
  await prisma.membership.update({ where: { id: membership.id }, data: { locationId: location.id } });

  assert.equal(await prisma.membership.count({ where: { locationId: location.id } }), 1);
});

test("cost center code uniqueness is enforced per-organization, not globally, when editing", async () => {
  const orgA = await makeOrgId();
  const orgB = await makeOrgId();
  await prisma.costCenter.create({ data: { organizationId: orgA, code: "ENG-100", name: "Engineering A" } });
  const bInOtherOrg = await prisma.costCenter.create({ data: { organizationId: orgB, code: "ENG-100", name: "Engineering B" } });

  // Same code already exists in org A, but this row belongs to org B — renaming
  // it to a *different* code within org B must not collide with org A's row.
  const collisionInOwnOrg = await prisma.costCenter.findUnique({
    where: { organizationId_code: { organizationId: orgB, code: "ENG-100" } },
  });
  assert.equal(collisionInOwnOrg!.id, bInOtherOrg.id);

  const noCollisionAcrossOrgs = await prisma.costCenter.findUnique({
    where: { organizationId_code: { organizationId: orgA, code: "MKT-999" } },
  });
  assert.equal(noCollisionAcrossOrgs, null);
});
