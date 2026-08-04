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
  const [projects, setProjects] = useState<{ id: string; name: string; _count?: { materials: number } }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [pRes, jRes] = await Promise.all([
      fetch("/api/proposals"),
      fetch("/api/projects"),
    ]);
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
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-deep)]">
          Customer proposals
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">Proposals</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sage)]">
          Polished material proposals across Windows, Doors, Lumber, Trusses, Cabinetry, Masonry
          Stone, Door Hardware, and Millwork — generated from project takeoff, PDF-ready, with
          customer accept links.
        </p>
      </div>

      {(error || message) && (
        <div
          className={`mb-4 rounded-md px-4 py-3 text-sm ${
            error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="mb-8 border border-[var(--line)] bg-white p-4">
        <h2 className="font-display text-xl font-semibold">New proposal from takeoff</h2>
        <p className="mt-1 text-sm text-[var(--sage)]">
          Pick a job that already has material takeoff lines. Categories with quantities become
          proposal sections automatically.
        </p>
        <form onSubmit={createFromProject} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium">Project</span>
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
          <button type="submit" className="btn-copper" disabled={busy || !projectId}>
            {busy ? "Building…" : "Create proposal"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold">All proposals</h2>
        {proposals.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--sage)]">
            No proposals yet. Run AI takeoff on a job, then create a proposal here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
            {proposals.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/proposals/${p.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-[var(--mist)]/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[var(--sage)]">{p.number}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 font-display text-lg font-semibold text-[var(--ink)]">
                      {p.title}
                    </p>
                    <p className="text-sm text-[var(--sage)]">
                      {p.customer?.name || "—"}
                      {p.project ? ` · ${p.project.name}` : ""}
                      {` · ${p._count.sections} categories`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-display text-xl font-semibold text-[var(--copper-deep)]">
                      {formatCurrencyExact(p.grandTotal)}
                    </p>
                    <p className="text-xs text-[var(--sage)]">
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
