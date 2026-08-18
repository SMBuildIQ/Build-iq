import { prisma } from "@/lib/db";
import { writeSystemAuditLog } from "@/lib/audit";

// Deterministic purchasing policy / rules engine (brief §18).
//
// This module is intentionally the ONLY place that decides what a purchase is
// allowed to do next (which approvals are required, how many bids are needed,
// whether AI may negotiate autonomously). The AI layer (src/lib/ai) may produce
// a *recommendation*, but it never calls into approval/PO creation directly —
// every such transition is routed through evaluatePurchasePolicy() first, and
// the AI is structurally barred from ever marking a purchase "approved" or
// finalized (see src/lib/ai/negotiation.ts — there is no such code path).

export interface PolicyEvaluation {
  requiredApprovals: { roleKey: string; reason: string; ruleId: string }[];
  minimumBidsRequired: number | null;
  warnings: string[];
}

/**
 * Evaluates every active PolicyRule for the organization against a purchase
 * amount (and any category/supplier context) and returns what must happen
 * before the purchase can proceed. Pure function over DB state — no AI calls.
 */
export async function evaluatePurchasePolicy(params: {
  organizationId: string;
  amount: number;
  isInternationalSupplier?: boolean;
  hasSubstitution?: boolean;
  supplierIsRestrictedForCategory?: boolean;
}): Promise<PolicyEvaluation> {
  const rules = await prisma.policyRule.findMany({
    where: { organizationId: params.organizationId, active: true },
    orderBy: { priority: "asc" },
  });

  const requiredApprovals: PolicyEvaluation["requiredApprovals"] = [];
  let minimumBidsRequired: number | null = null;
  const warnings: string[] = [];

  for (const rule of rules) {
    switch (rule.type) {
      case "approval_threshold": {
        const min = rule.minAmount ?? 0;
        const max = rule.maxAmount ?? Infinity;
        if (params.amount >= min && params.amount < max && rule.requiredApproverRoleKey) {
          requiredApprovals.push({
            roleKey: rule.requiredApproverRoleKey,
            reason: `Purchase amount $${params.amount.toLocaleString()} requires ${rule.requiredApproverRoleKey} approval per policy`,
            ruleId: rule.id,
          });
        }
        break;
      }
      case "bid_count_minimum": {
        const min = rule.minAmount ?? 0;
        if (params.amount >= min && rule.requiredBidCount) {
          minimumBidsRequired = Math.max(minimumBidsRequired ?? 0, rule.requiredBidCount);
        }
        break;
      }
      case "international_supplier_approval": {
        if (params.isInternationalSupplier && rule.requiredApproverRoleKey) {
          requiredApprovals.push({
            roleKey: rule.requiredApproverRoleKey,
            reason: "International supplier requires additional approval per policy",
            ruleId: rule.id,
          });
        }
        break;
      }
      case "substitution_requires_approval": {
        if (params.hasSubstitution && rule.requiredApproverRoleKey) {
          requiredApprovals.push({
            roleKey: rule.requiredApproverRoleKey,
            reason: "Product substitution always requires buyer approval per policy",
            ruleId: rule.id,
          });
        }
        break;
      }
      case "restricted_supplier_category": {
        if (params.supplierIsRestrictedForCategory) {
          warnings.push("Selected supplier is not on the approved list for this category");
        }
        break;
      }
      default:
        break;
    }
  }

  return { requiredApprovals, minimumBidsRequired, warnings };
}

/**
 * Creates the ApprovalRequest + sequenced ApprovalSteps for a purchase request
 * based on policy evaluation. Idempotent per call site — callers should only
 * invoke this at a defined transition point (e.g. quote selection), not on
 * every read.
 */
export async function createApprovalRequest(params: {
  organizationId: string;
  purchaseRequestId: string;
  amount: number;
  evaluation: PolicyEvaluation;
}) {
  if (params.evaluation.requiredApprovals.length === 0) {
    return null;
  }

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      purchaseRequestId: params.purchaseRequestId,
      amount: params.amount,
      reason: params.evaluation.requiredApprovals.map((a) => a.reason).join("; "),
      steps: {
        create: params.evaluation.requiredApprovals.map((approval, index) => ({
          sequence: index + 1,
          requiredRoleKey: approval.roleKey,
        })),
      },
    },
    include: { steps: true },
  });

  await writeSystemAuditLog(params.organizationId, "system", {
    action: "approval_request.created",
    entityType: "ApprovalRequest",
    entityId: approvalRequest.id,
    after: params.evaluation,
  });

  return approvalRequest;
}

/** brief §17/§18: AI may never decide financial authority alone. This is the sole
 * gate a negotiation service is allowed to check before acting autonomously. */
export async function canNegotiateAutonomously(organizationId: string, purchaseValue: number): Promise<boolean> {
  const authority = await prisma.negotiationAuthority.findFirst({ where: { organizationId } });
  if (!authority || !authority.autoNegotiateEnabled) return false;
  if (authority.maxPurchaseValue !== null && purchaseValue > authority.maxPurchaseValue) return false;
  return true;
}
