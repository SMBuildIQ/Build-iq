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
      <section className="site-topband">
        <div className="site-topband__inner flex flex-col gap-6 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="site-topband__eyebrow">{user.companyName || "Your company"}</p>
            <h1 className="mt-2 font-display text-5xl text-white sm:text-6xl">Jobs</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Active estimates and proposal-ready builds — materials, takeoffs, and packages under
              one Supply Monkey workspace.
            </p>
          </div>
          <Link href="/projects/new" className="btn-copper shrink-0 !px-5 !py-3 !text-sm">
            New job
          </Link>
        </div>
      </section>

      {projects.length === 0 ? (
        <div className="site-panel mt-10 px-6 py-16 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/banana-icon.png" alt="" className="mx-auto h-12 w-12 opacity-90" />
          <p className="font-hand mt-5 text-2xl text-[var(--orange-deep)]">Ready when you are</p>
          <h2 className="mt-2 font-display text-3xl text-[var(--brown-ink)]">No projects yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--sage)]">
            Create a residential job, upload plans, and let BuildIQ assemble the takeoff, estimate,
            and customer proposal.
          </p>
          <Link href="/projects/new" className="btn-copper mt-8 inline-flex">
            Create first project
          </Link>
        </div>
      ) : (
        <div className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="site-kicker">Active work</p>
              <h2 className="mt-1 font-display text-2xl text-[var(--brown-ink)]">
                {projects.length} job{projects.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>
          <ul className="premium-list site-panel">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="site-card-hover flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="font-display text-xl text-[var(--brown-ink)]">{p.name}</h3>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-[var(--sage)]">
                      {[p.city, p.state].filter(Boolean).join(", ") || "Address TBD"}
                      {p.squareFeet ? ` · ${p.squareFeet.toLocaleString()} sf` : ""}
                    </p>
                    <p className="mt-1 text-xs tracking-wide text-[var(--ink-soft)]">
                      {p._count.blueprints} plans · {p._count.materials} materials ·{" "}
                      {p._count.bidPackages} bids
                    </p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="price-display text-3xl">
                      {p.estimate ? formatCurrency(p.estimate.grandTotal) : "—"}
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--sage)]">
                      Estimate
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
