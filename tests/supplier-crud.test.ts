import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { createOrganizationWithOwner } from "../src/lib/org/bootstrap";

// brief §8: the vendor database. Response-rate/on-time/performance scoring
// already had dedicated tests (supplier-performance.test.ts); basic create/
// list — the foundation everything else in the vendor database sits on top
// of — did not. Tenant scoping for suppliers is already covered by
// tenant-isolation.test.ts, not duplicated here.

async function makeOrgId(): Promise<string> {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { email: `supplier-crud-${suffix}@example.com`, passwordHash: await hashPassword("password123!"), name: "Supplier CRUD Test User" },
  });
  const { organization } = await createOrganizationWithOwner({ name: `Supplier CRUD Org ${suffix}`, slug: `supplier-crud-org-${suffix}`, ownerUserId: user.id });
  return organization.id;
}

test("a supplier created with a contact persists both, with the contact marked primary", async () => {
  const orgId = await makeOrgId();
  const supplier = await prisma.supplier.create({
    data: {
      organizationId: orgId,
      name: "Acme Supply Co",
      status: "active",
      categories: JSON.stringify([]),
      contacts: { create: [{ name: "Jane Buyer", email: "jane@acme.example", isPrimary: true }] },
    },
    include: { contacts: true },
  });

  assert.equal(supplier.contacts.length, 1);
  assert.equal(supplier.contacts[0].isPrimary, true);
  assert.equal(supplier.contacts[0].email, "jane@acme.example");
});

test("a supplier can be created with no contact at all", async () => {
  const orgId = await makeOrgId();
  const supplier = await prisma.supplier.create({
    data: { organizationId: orgId, name: "No Contact Supplier", status: "active", categories: JSON.stringify([]) },
    include: { contacts: true },
  });
  assert.equal(supplier.contacts.length, 0);
});

test("categories are stored as a JSON array and round-trip exactly", async () => {
  const orgId = await makeOrgId();
  const supplier = await prisma.supplier.create({
    data: { organizationId: orgId, name: "Categorized Supplier", status: "active", categories: JSON.stringify(["Electronics", "Office Supplies"]) },
  });
  assert.deepEqual(JSON.parse(supplier.categories!), ["Electronics", "Office Supplies"]);
});

test("listing filters by status when given, and returns everything when not", async () => {
  const orgId = await makeOrgId();
  await prisma.supplier.create({ data: { organizationId: orgId, name: "Active Co", status: "active", categories: "[]" } });
  await prisma.supplier.create({ data: { organizationId: orgId, name: "Restricted Co", status: "restricted", categories: "[]" } });

  const all = await prisma.supplier.findMany({ where: { organizationId: orgId } });
  assert.equal(all.length, 2);

  const activeOnly = await prisma.supplier.findMany({ where: { organizationId: orgId, status: "active" } });
  assert.equal(activeOnly.length, 1);
  assert.equal(activeOnly[0].name, "Active Co");
});

test("a newly created supplier has no performance score yet — unrated, not defaulted to zero", async () => {
  const orgId = await makeOrgId();
  const supplier = await prisma.supplier.create({
    data: { organizationId: orgId, name: "Brand New Supplier", status: "active", categories: "[]" },
  });
  assert.equal(supplier.performanceScore, null);
  assert.equal(supplier.responseRate, null);
});
