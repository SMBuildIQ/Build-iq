import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { NewPurchaseForm } from "./new-purchase-form";

export default async function NewPurchasePage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  const [departments, costCenters, locations] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { name: "asc" } }),
    prisma.costCenter.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { code: "asc" } }),
    prisma.location.findMany({ where: { organizationId: ctx.organizationId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">Describe what you need</h1>
      <p className="mb-6 text-sm text-gray-500">
        Write it like you&apos;d tell a colleague. BuildIQ extracts quantity, specs, budget, delivery date and
        location, then asks about anything critical it can&apos;t find.
      </p>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <NewPurchaseForm
          departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          costCenters={costCenters.map((c) => ({ id: c.id, code: c.code, name: c.name }))}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </div>
    </div>
  );
}
