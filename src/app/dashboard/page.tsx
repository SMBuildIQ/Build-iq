import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/AppNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      estimate: true,
      _count: { select: { blueprints: true, materials: true, bidPackages: true } },
    },
  });

  return (
    <AppShell user={user}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sage)]">
            {user.companyName || "Your workspace"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">Projects</h1>
        </div>
        <Link href="/projects/new" className="btn-copper !rounded-xl !px-3.5 !py-2.5 !text-sm">
          New
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] px-5 py-12 text-center">
          <h2 className="font-display text-2xl font-semibold">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sage)]">
            Create a residential project, upload blueprints, and let BuildIQ build the takeoff.
          </p>
          <Link href="/projects/new" className="btn-primary mt-6 !rounded-xl">
            Create first project
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-2xl border border-[var(--line)] bg-white/50 p-4 transition active:scale-[0.99] hover:bg-white/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-[var(--ink)]">{p.name}</h2>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--sage)]">
                      {[p.city, p.state].filter(Boolean).join(", ") || "Address TBD"}
                      {p.squareFeet ? ` · ${p.squareFeet.toLocaleString()} sf` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--sage)]">
                      {p._count.blueprints} plans · {p._count.materials} materials · {p._count.bidPackages} bids
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-xl font-semibold text-[var(--ink)]">
                      {p.estimate ? formatCurrency(p.estimate.grandTotal) : "—"}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
