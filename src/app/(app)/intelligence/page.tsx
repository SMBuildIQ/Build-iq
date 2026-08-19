import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { hasPermission } from "@/lib/permissions/check";
import { PurchasingQueryForm } from "./query-form";

// brief §25/§30: was a PlannedModule stub ("Backed by PriceBenchmark and the
// full purchase history graph") — now a real natural-language query surface
// over that same purchase history graph. See src/lib/ai/purchasingQuery.ts.
export default async function IntelligencePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "analytics:view")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Purchasing intelligence</h1>
        <p className="text-sm text-gray-500">Ask questions about your organization&apos;s real purchase history.</p>
      </div>
      <PurchasingQueryForm />
    </div>
  );
}
