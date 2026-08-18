import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions/check";

export default async function AuditLogPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!hasPermission(ctx, "audit_log:view")) redirect("/settings");

  const entries = await prisma.auditLog.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const actorIds = [...new Set(entries.map((e) => e.actorUserId).filter((id): id is string => !!id))];
  const actors = actorIds.length
    ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
    : [];
  const actorNameById = new Map(actors.map((a) => [a.id, a.name]));

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-xl font-semibold">Audit log</h1>
      <p className="mb-6 text-sm text-gray-500">Every state-changing action in your organization — who, what, when.</p>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No activity recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    {e.actorType === "user" ? (actorNameById.get(e.actorUserId ?? "") ?? "Unknown user") : `[${e.actorType}]`}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {e.entityType} · {e.entityId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
