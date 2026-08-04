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
    where: { companyId: user.companyId },
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
            {user.companyName || "Your company"}
          </p>
          <h1 className="mt-1 font-display text-3xl text-[var(--brown)]">Jobs</h1>
        </div>
        <Link href="/projects/new" className="btn-copper !px-3.5 !py-2.5 !text-sm">
          New
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="surface mt-10 border-dashed px-5 py-12 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/banana-icon.png" alt="" className="mx-auto h-10 w-10" />
          <h2 className="mt-4 font-display text-2xl text-[var(--brown)]">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--sage)]">
            Create a residential project, upload blueprints, and let BuildIQ build the takeoff.
          </p>
          <Link href="/projects/new" className="btn-copper mt-6">
            Create first project
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="surface block p-4 transition active:scale-[0.99] hover:border-[var(--orange)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg text-[var(--brown)]">{p.name}</h2>
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
                    <p className="font-display text-xl text-[var(--orange)]">
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
