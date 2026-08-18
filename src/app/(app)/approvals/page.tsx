import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { PlannedModule } from "@/components/PlannedModule";
import { DecideButtons } from "./approval-actions";

export default async function ApprovalsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const pending = await prisma.approvalRequest.findMany({
    where: { purchaseRequest: { organizationId: ctx.organizationId }, status: "pending" },
    include: { purchaseRequest: true, steps: true },
    orderBy: { createdAt: "desc" },
  });

  if (pending.length === 0) {
    return (
      <PlannedModule
        title="Approvals"
        description="No approvals are pending right now. The deterministic policy engine (src/lib/policy) generates approval steps automatically when a quote is selected on a purchase request."
        schemaNote="Backed by ApprovalRequest, ApprovalStep, PolicyRule — see DATABASE_SCHEMA.md."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold">Approvals</h1>
      <div className="flex flex-col gap-4">
        {pending.map((a) => (
          <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <Link href={`/purchases/${a.purchaseRequestId}`} className="font-medium text-gray-900 underline">
              {a.purchaseRequest.title}
            </Link>
            <div className="mb-3 text-sm text-gray-500">
              {a.reason} {a.amount ? `— $${a.amount.toLocaleString()}` : ""}
            </div>
            <div className="flex flex-col gap-3">
              {a.steps
                .sort((x, y) => x.sequence - y.sequence)
                .map((step) => (
                  <div key={step.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                    <div className="text-sm">
                      Step {step.sequence}: <span className="font-medium">{step.requiredRoleKey}</span>
                      {step.decision && <span className="ml-2 text-xs text-gray-400">→ {step.decision}</span>}
                    </div>
                    {!step.decision && (
                      <DecideButtons
                        stepId={step.id}
                        canDecide={ctx.roleKeys.includes(step.requiredRoleKey) || ctx.roleKeys.includes("company_owner")}
                      />
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
