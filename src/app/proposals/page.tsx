"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/AppNav";
import { useMe } from "@/hooks/useMe";
import { formatCurrencyExact } from "@/lib/format";

type ProposalRow = {
  id: string;
  number: string;
  title: string;
  status: string;
  grandTotal: number;
  depositAmount: number;
  updatedAt: string;
  customer: { id: string; name: string; email: string | null } | null;
  project: { id: string; name: string; status: string } | null;
  _count: { sections: number };
};

export default function ProposalsPage() {
  const { user } = useMe();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [pRes, jRes] = await Promise.all([fetch("/api/proposals"), fetch("/api/projects")]);
    const pData = await pRes.json();
    const jData = await jRes.json();
    if (!pRes.ok) {
      setError(pData.error || "Could not load proposals");
      return;
    }
    setProposals(pData.proposals || []);
    setProjects(jData.projects || []);
    setError("");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createFromProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create proposal");
      return;
    }
    setMessage(`Created ${data.proposal?.number}`);
    setProjectId("");
    await load();
    if (data.proposal?.id) {
      window.location.href = `/proposals/${data.proposal.id}`;
    }
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <section className="site-topband">
        <div className="site-topband__inner px-6 py-8">
          <p className="site-topband__eyebrow">Customer-facing</p>
          <h1 className="mt-2 font-display text-5xl text-white sm:text-6xl">Proposals</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
            Polished material proposals across every Supply Monkey category — PDF-ready with
            secure customer accept links.
          </p>
        </div>
      </section>

      {(error || message) && (
        <div
          className={`mt-6 border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-[var(--line)] bg-[var(--mist)] text-[var(--brown-ink)]"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="site-panel mt-8 p-6">
        <p className="site-kicker">Compose</p>
        <h2 className="mt-1 font-display text-2xl text-[var(--brown-ink)]">
          New proposal from takeoff
        </h2>
        <div className="site-rule mt-3" />
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--sage)]">
          Choose a job with material takeoff. Categories with quantities become proposal sections
          automatically.
        </p>
        <form
          onSubmit={createFromProject}
          className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1.5 text-sm">
            <span className="label">Project</span>
            <select
              className="input-field"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
            >
              <option value="">Select job…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-copper !px-6" disabled={busy || !projectId}>
            {busy ? "Building…" : "Create proposal"}
          </button>
        </form>
      </section>

      <section className="mt-12">
        <p className="site-kicker">Portfolio</p>
        <h2 className="mt-1 font-display text-2xl text-[var(--brown-ink)]">All proposals</h2>
        <div className="site-rule mt-3" />

        {proposals.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--sage)]">
            No proposals yet. Run AI takeoff on a job, then create a proposal here.
          </p>
        ) : (
          <ul className="premium-list site-panel mt-6">
            {proposals.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/proposals/${p.id}`}
                  className="site-card-hover flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[11px] tracking-wide text-[var(--sage)]">
                        {p.number}
                      </span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-2 font-display text-xl text-[var(--brown-ink)]">{p.title}</p>
                    <p className="mt-1 text-sm text-[var(--sage)]">
                      {p.customer?.name || "—"}
                      {p.project ? ` · ${p.project.name}` : ""}
                      {` · ${p._count.sections} categories`}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="price-display text-3xl">{formatCurrencyExact(p.grandTotal)}</p>
                    <p className="mt-1 text-xs text-[var(--sage)]">
                      Deposit {formatCurrencyExact(p.depositAmount)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
