import { prisma } from "@/lib/db";
import { PERMISSIONS, DEFAULT_ROLES } from "@/lib/permissions/catalog";

/** Idempotent — safe to call on every registration in case prisma/seed.ts hasn't run. */
export async function ensurePermissionCatalog() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description, category: p.category },
      create: { key: p.key, description: p.description, category: p.category },
    });
  }
}

/**
 * Creates a new tenant with its default role set (brief §2 example roles) and the
 * standard starter policy (brief §18 example thresholds) — an org that never opens
 * Settings still gets sane, explainable approval routing and a disabled-by-default
 * AI negotiation authority (no autonomy is ever granted silently).
 */
export async function createOrganizationWithOwner(params: {
  name: string;
  slug: string;
  ownerUserId: string;
}) {
  await ensurePermissionCatalog();

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: params.name, slug: params.slug },
    });

    const roleRecords = await Promise.all(
      DEFAULT_ROLES.map((r) =>
        tx.role.create({
          data: {
            organizationId: organization.id,
            key: r.key,
            name: r.name,
            isSystem: true,
            permissions: { create: r.permissions.map((key) => ({ permissionKey: key })) },
          },
        })
      )
    );

    const ownerRole = roleRecords.find((r) => r.key === "company_owner")!;

    const membership = await tx.membership.create({
      data: {
        userId: params.ownerUserId,
        organizationId: organization.id,
        status: "active",
        roles: { create: [{ roleId: ownerRole.id }] },
      },
    });

    // Starter policy rules mirroring brief §18's worked examples. Editable per org
    // under Settings → Purchasing Policies once that UI ships past MVP.
    await tx.policyRule.createMany({
      data: [
        { organizationId: organization.id, type: "approval_threshold", minAmount: 0, maxAmount: 1000, requiredApproverRoleKey: "department_manager", priority: 1 },
        { organizationId: organization.id, type: "approval_threshold", minAmount: 1000, maxAmount: 25000, requiredApproverRoleKey: "purchasing_manager", priority: 2 },
        { organizationId: organization.id, type: "approval_threshold", minAmount: 25000, maxAmount: 50000, requiredApproverRoleKey: "purchasing_director", priority: 3 },
        { organizationId: organization.id, type: "approval_threshold", minAmount: 50000, maxAmount: 250000, requiredApproverRoleKey: "cfo", priority: 4 },
        { organizationId: organization.id, type: "approval_threshold", minAmount: 250000, maxAmount: null, requiredApproverRoleKey: "cfo", priority: 5 },
        { organizationId: organization.id, type: "bid_count_minimum", minAmount: 5000, requiredBidCount: 3, priority: 6 },
        { organizationId: organization.id, type: "international_supplier_approval", requiredApproverRoleKey: "purchasing_director", priority: 7 },
        { organizationId: organization.id, type: "substitution_requires_approval", requiredApproverRoleKey: "buyer", priority: 8 },
      ],
    });

    await tx.negotiationAuthority.create({
      data: {
        organizationId: organization.id,
        autoNegotiateEnabled: false,
        maxPurchaseValue: 10000,
        targetSavingsPct: 8,
        minPaymentTermsDays: 30,
        allowSubstitutions: false,
        allowFinalize: false,
        maxNegotiationRounds: 3,
      },
    });

    return { organization, membership };
  });
}
