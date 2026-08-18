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

test("verifyEntityOwnership rejects an rfq_supplier id (quote document upload target) from a different org", async () => {
  const { randomBytes } = await import("node:crypto");
  const { verifyEntityOwnership } = await import("../src/lib/documents/entityOwnership");
  const orgA = await makeOrg("rfqsup-tenant-a");
  const orgB = await makeOrg("rfqsup-tenant-b");

  const supplier = await prisma.supplier.create({ data: { organizationId: orgA.organization.id, name: "Org A Supplier" } });
  const pr = await prisma.purchaseRequest.create({
    data: { organizationId: orgA.organization.id, requestNumber: `PR-${randomUUID().slice(0, 8)}`, requesterId: orgA.user.id, title: "t", status: "rfq_active" },
  });
  const rfq = await prisma.rFQ.create({
    data: { organizationId: orgA.organization.id, purchaseRequestId: pr.id, rfqNumber: `RFQ-${randomUUID().slice(0, 8)}`, status: "sent" },
  });
  const rfqSupplier = await prisma.rFQSupplier.create({
    data: { rfqId: rfq.id, supplierId: supplier.id, secureToken: randomBytes(12).toString("hex") },
  });

  assert.equal(await verifyEntityOwnership(orgA.organization.id, "rfq_supplier", rfqSupplier.id), true);
  assert.equal(await verifyEntityOwnership(orgB.organization.id, "rfq_supplier", rfqSupplier.id), false);
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

test("an invite created in org A is not reachable via org B's tenant-scoped query", async () => {
  const { randomBytes } = await import("node:crypto");
  const orgA = await makeOrg("invite-tenant-a");
  const orgB = await makeOrg("invite-tenant-b");

  const invite = await prisma.invite.create({
    data: {
      organizationId: orgA.organization.id,
      email: "invitee@example.com",
      code: randomBytes(24).toString("hex"),
      roleKey: "buyer",
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });

  const crossTenant = await prisma.invite.findFirst({
    where: { id: invite.id, organizationId: orgB.organization.id },
  });
  assert.equal(crossTenant, null);

  // The invite's code is looked up globally by the public accept endpoint
  // (no session yet) — but which organization it grants access to is fixed
  // at creation time and can't be redirected by the accepting request.
  const byCode = await prisma.invite.findUnique({ where: { code: invite.code } });
  assert.equal(byCode?.organizationId, orgA.organization.id);
});

test("department/cost center/location ids from another org are rejected by the same query shape purchase-request creation uses", async () => {
  const orgA = await makeOrg("ref-tenant-a");
  const orgB = await makeOrg("ref-tenant-b");

  const department = await prisma.department.create({ data: { organizationId: orgA.organization.id, name: "Engineering" } });
  const costCenter = await prisma.costCenter.create({ data: { organizationId: orgA.organization.id, code: "ENG-100", name: "Engineering" } });
  const location = await prisma.location.create({
    data: { organizationId: orgA.organization.id, name: "HQ", addressLine1: "1 Main St", city: "Detroit", country: "US" },
  });

  assert.equal(await prisma.department.findFirst({ where: { id: department.id, organizationId: orgB.organization.id } }), null);
  assert.equal(await prisma.costCenter.findFirst({ where: { id: costCenter.id, organizationId: orgB.organization.id } }), null);
  assert.equal(await prisma.location.findFirst({ where: { id: location.id, organizationId: orgB.organization.id } }), null);

  assert.ok(await prisma.department.findFirst({ where: { id: department.id, organizationId: orgA.organization.id } }));
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
