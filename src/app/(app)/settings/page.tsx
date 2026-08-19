import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/check";
import { InviteForm, RevokeInviteButton } from "./team-section";
import { DepartmentsSection, CostCentersSection, LocationsSection } from "./org-setup-section";
import { MfaSection } from "./mfa-section";
import { OrgMfaPolicySection } from "./org-mfa-policy-section";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const [organization, roles, policyRules, negotiationAuthority, memberships, pendingInvites, departments, costCenters, locations, currentUser] =
    await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: ctx.organizationId } }),
      prisma.role.findMany({
        where: { organizationId: ctx.organizationId },
        include: { permissions: true, memberships: true },
        orderBy: { name: "asc" },
      }),
      prisma.policyRule.findMany({ where: { organizationId: ctx.organizationId, active: true }, orderBy: { priority: "asc" } }),
      prisma.negotiationAuthority.findFirst({ where: { organizationId: ctx.organizationId } }),
      prisma.membership.findMany({
        where: { organizationId: ctx.organizationId, status: "active" },
        include: { user: true, roles: { include: { role: true } } },
        orderBy: { createdAt: "asc" },
      }),
      hasPermission(ctx, "org:manage_users")
        ? prisma.invite.findMany({ where: { organizationId: ctx.organizationId, status: "pending" }, orderBy: { createdAt: "desc" } })
        : Promise.resolve([]),
      prisma.department.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { name: "asc" } }),
      prisma.costCenter.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { code: "asc" } }),
      prisma.location.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { name: "asc" } }),
      prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { mfaEnabled: true } }),
    ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">Settings</h1>

      <Section title="Organization">
        <div className="text-sm">
          <div>
            <span className="text-gray-500">Name:</span> {organization.name}
          </div>
          <div>
            <span className="text-gray-500">Slug:</span> {organization.slug}
          </div>
          <div>
            <span className="text-gray-500">Currency:</span> {organization.currency}
          </div>
        </div>
      </Section>

      <Section title="Two-factor authentication">
        <MfaSection mfaEnabled={currentUser.mfaEnabled} />
      </Section>

      {hasPermission(ctx, "org:manage_settings") && (
        <Section title="Two-factor authentication policy">
          <OrgMfaPolicySection requireMfa={organization.requireMfa} />
        </Section>
      )}

      <Section title="Locations">
        <LocationsSection locations={locations} />
      </Section>

      <Section title="Departments">
        <DepartmentsSection departments={departments} />
      </Section>

      <Section title="Cost centers">
        <CostCentersSection costCenters={costCenters} />
      </Section>

      <Section title="Team">
        <div className="mb-3 flex flex-col gap-2">
          {memberships.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{m.user.name}</div>
                <div className="text-xs text-gray-400">{m.user.email}</div>
              </div>
              <span className="text-xs text-gray-500">{m.roles.map((r) => r.role.name).join(", ")}</span>
            </div>
          ))}
        </div>

        {hasPermission(ctx, "org:manage_users") && (
          <>
            {pendingInvites.length > 0 && (
              <div className="mb-3 flex flex-col gap-1">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <span>
                      {inv.email} — invited as {inv.roleKey}
                    </span>
                    <RevokeInviteButton inviteId={inv.id} />
                  </div>
                ))}
              </div>
            )}
            <InviteForm roles={roles.map((r) => ({ key: r.key, name: r.name }))} />
          </>
        )}
      </Section>

      <Section title="Roles">
        <div className="flex flex-col gap-2">
          {roles.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm">
              <span className="font-medium">{r.name}</span>
              <span className="text-gray-400">
                {r.permissions.length} permissions · {r.memberships.length} members
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Purchasing policy">
        <div className="flex flex-col gap-2 text-sm">
          {policyRules.map((rule) => (
            <div key={rule.id} className="rounded-md border border-gray-100 px-3 py-2">
              {describeRule(rule)}
            </div>
          ))}
        </div>
      </Section>

      <Section title="AI negotiation authority">
        {negotiationAuthority ? (
          <ul className="list-inside list-disc text-sm text-gray-700">
            <li>Autonomous negotiation: {negotiationAuthority.autoNegotiateEnabled ? "Enabled" : "Disabled"}</li>
            <li>Max purchase value: ${negotiationAuthority.maxPurchaseValue?.toLocaleString() ?? "—"}</li>
            <li>Target savings: {negotiationAuthority.targetSavingsPct}%</li>
            <li>Minimum payment terms: Net {negotiationAuthority.minPaymentTermsDays} days</li>
            <li>Max negotiation rounds: {negotiationAuthority.maxNegotiationRounds}</li>
            <li>AI may finalize a purchase: {negotiationAuthority.allowFinalize ? "Yes" : "Never"}</li>
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Not configured.</p>
        )}
      </Section>

      {hasPermission(ctx, "audit_log:view") && (
        <Section title="Activity">
          <Link href="/settings/audit-log" className="text-sm text-gray-900 underline">
            View audit log
          </Link>
        </Section>
      )}
    </div>
  );
}

function describeRule(rule: {
  type: string;
  minAmount: number | null;
  maxAmount: number | null;
  requiredApproverRoleKey: string | null;
  requiredBidCount: number | null;
}): string {
  switch (rule.type) {
    case "approval_threshold":
      return `Purchases ${rule.minAmount ? `over $${rule.minAmount.toLocaleString()}` : ""}${
        rule.maxAmount ? ` up to $${rule.maxAmount.toLocaleString()}` : " and above"
      } require ${rule.requiredApproverRoleKey} approval`;
    case "bid_count_minimum":
      return `Purchases over $${rule.minAmount?.toLocaleString()} require ${rule.requiredBidCount} bids`;
    case "international_supplier_approval":
      return `International suppliers require ${rule.requiredApproverRoleKey} approval`;
    case "substitution_requires_approval":
      return `Product substitutions always require ${rule.requiredApproverRoleKey} approval`;
    default:
      return rule.type;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      {children}
    </div>
  );
}
