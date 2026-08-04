"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/hooks/useMe";

type Opportunity = {
  id: string;
  stage: string;
  status: string;
  projectAddress: string | null;
  updatedAt: string;
  customer: { id: string; name: string; type: string };
  project: { id: string; name: string; status: string };
  productLine: { id: string; name: string; slug: string } | null;
};

type ProductLine = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  specsJson: string;
};

export default function CabinetryHubPage() {
  const { user } = useMe();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [productLineSlug, setProductLineSlug] = useState("mesa");
  const [supplyScope, setSupplyScope] = useState("SUPPLY_AND_INSTALL");
  const [constructionType, setConstructionType] = useState("NEW_CONSTRUCTION");

  const load = useCallback(async () => {
    const [oRes, lRes] = await Promise.all([
      fetch("/api/cabinetry/opportunities"),
      fetch("/api/cabinetry/product-lines"),
    ]);
    const oData = await oRes.json();
    const lData = await lRes.json();
    if (!oRes.ok) {
      setError(oData.error || "Could not load opportunities");
      return;
    }
    if (!lRes.ok) {
      setError(lData.error || "Could not load product lines");
      return;
    }
    setOpportunities(oData.opportunities || []);
    setLines(lData.productLines || []);
    setError("");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createOpportunity(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/cabinetry/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        projectName,
        productLineSlug,
        supplyScope,
        constructionType,
        builderName: customerName,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create opportunity");
      return;
    }
    setCustomerName("");
    setProjectName("");
    setMessage("Opportunity created.");
    await load();
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-deep)]">
          Phase 1 · Partial
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">Cabinetry</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sage)]">
          AI-assisted cabinetry proposals inside BuildIQ. Phase 1: customers, product lines (Mesa /
          Summit / Pinnacle), and opportunities linked to projects.
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
        <h2 className="font-display text-xl font-semibold">New opportunity</h2>
        <form onSubmit={createOpportunity} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-[var(--sage)]">Customer / builder</span>
            <input
              required
              className="input-field"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ridge Homes"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-[var(--sage)]">Project name</span>
            <input
              required
              className="input-field"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Kitchen remodel — Oak St"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-[var(--sage)]">Product line</span>
            <select
              className="input-field"
              value={productLineSlug}
              onChange={(e) => setProductLineSlug(e.target.value)}
            >
              {lines.map((l) => (
                <option key={l.id} value={l.slug}>
                  {l.name}
                </option>
              ))}
              {lines.length === 0 && (
                <>
                  <option value="mesa">Mesa</option>
                  <option value="summit">Summit</option>
                  <option value="pinnacle">Pinnacle</option>
                </>
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-[var(--sage)]">Scope</span>
            <select
              className="input-field"
              value={supplyScope}
              onChange={(e) => setSupplyScope(e.target.value)}
            >
              <option value="SUPPLY_AND_INSTALL">Supply & install</option>
              <option value="SUPPLY_ONLY">Supply only</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-[var(--sage)]">Construction</span>
            <select
              className="input-field"
              value={constructionType}
              onChange={(e) => setConstructionType(e.target.value)}
            >
              <option value="NEW_CONSTRUCTION">New construction</option>
              <option value="REMODEL">Remodel</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={busy} className="btn-copper w-full !py-3">
              {busy ? "Creating…" : "Create opportunity"}
            </button>
          </div>
        </form>
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold">Opportunities</h2>
        {opportunities.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--sage)]">No cabinetry opportunities yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {opportunities.map((o) => (
              <li key={o.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div>
                  <Link
                    href={`/cabinetry/opportunities/${o.id}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--copper-deep)]"
                  >
                    {o.project.name}
                  </Link>
                  <p className="text-[var(--sage)]">
                    {o.customer.name} · {o.productLine?.name || "No line"} · {o.stage.replace(/_/g, " ")}
                  </p>
                </div>
                <Link
                  href={`/projects/${o.project.id}`}
                  className="shrink-0 text-xs text-[var(--copper-deep)] underline-offset-2 hover:underline"
                >
                  Job
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold">Product lines</h2>
        <p className="mt-1 text-sm text-[var(--sage)]">
          Specs are stored in the database and editable by catalog admins — not hard-coded prices.
        </p>
        <ul className="mt-3 space-y-3">
          {lines.map((l) => {
            let specs: Record<string, unknown> = {};
            try {
              specs = JSON.parse(l.specsJson || "{}");
            } catch {
              specs = {};
            }
            return (
              <li key={l.id} className="border border-[var(--line)] bg-white px-4 py-3 text-sm">
                <p className="font-medium text-[var(--ink)]">{l.name}</p>
                <p className="text-[var(--sage)]">{l.description}</p>
                <ul className="mt-2 list-inside list-disc text-xs text-[var(--sage)]">
                  {Object.entries(specs).map(([k, v]) => (
                    <li key={k}>
                      {k}: {String(v)}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="border border-[var(--line)] bg-[#faf7f2] px-4 py-3 text-sm text-[var(--sage)]">
        Next Phase 1 items: document categories, AI extraction review, catalog import, pricing engine,
        proposals/deposits. See <code className="text-[var(--ink)]">CABINETRY_INTEGRATION_AUDIT.md</code>.
      </div>
    </AppShell>
  );
}
