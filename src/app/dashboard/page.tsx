import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav, StatusBadge } from "@/components/AppNav";
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
    <div className="min-h-screen bg-[var(--paper)]">
      <AppNav user={user} />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--sage)]">
              {user.companyName || "Your workspace"}
            </p>
            <h1 className="mt-1 font-display text-4xl font-semibold text-[var(--ink)]">Projects</h1>
          </div>
          <Link href="/projects/new" className="btn-copper">
            New estimate
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-16 border border-dashed border-[var(--line)] px-6 py-16 text-center">
            <h2 className="font-display text-2xl font-semibold">No projects yet</h2>
            <p className="mx-auto mt-2 max-w-md text-[var(--sage)]">
              Create a residential project, upload blueprints, and let BuildIQ build the takeoff.
            </p>
            <Link href="/projects/new" className="btn-primary mt-6">
              Create first project
            </Link>
          </div>
        ) : (
          <ul className="mt-10 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:bg-black/[0.02]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-xl font-semibold text-[var(--ink)]">{p.name}</h2>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--sage)]">
                      {[p.city, p.state].filter(Boolean).join(", ") || "Address TBD"}
                      {p.squareFeet ? ` · ${p.squareFeet.toLocaleString()} sf` : ""}
                      {` · ${p._count.blueprints} plans · ${p._count.materials} materials · ${p._count.bidPackages} bids`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-semibold text-[var(--ink)]">
                      {p.estimate ? formatCurrency(p.estimate.grandTotal) : "—"}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-[var(--sage)]">
                      {p.estimate ? "Grand total" : "Not estimated"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
