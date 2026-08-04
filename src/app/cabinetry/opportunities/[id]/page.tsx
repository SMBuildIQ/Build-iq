"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/hooks/useMe";
import { CABINETRY_STAGES } from "@/lib/cabinetry/defaults";

type Opportunity = {
  id: string;
  stage: string;
  status: string;
  version: number;
  notes: string | null;
  builderName: string | null;
  architectName: string | null;
  designerName: string | null;
  projectAddress: string | null;
  constructionType: string | null;
  supplyScope: string | null;
  taxStatus: string | null;
  customer: { id: string; name: string; type: string; email: string | null };
  project: { id: string; name: string; status: string };
  productLine: { id: string; name: string; slug: string; specsJson: string } | null;
};

export default function CabinetryOpportunityPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useMe();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cabinetry/opportunities/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Not found");
      return;
    }
    setOpportunity(data.opportunity);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStage(stage: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/cabinetry/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Update failed");
      return;
    }
    setOpportunity(data.opportunity);
    setMessage(`Stage → ${stage.replace(/_/g, " ")}`);
  }

  if (!opportunity && !error) {
    return (
      <AppShell user={user || { name: "You" }}>
        <p className="py-10 text-[var(--sage)]">Loading opportunity…</p>
      </AppShell>
    );
  }

  if (!opportunity) {
    return (
      <AppShell user={user || { name: "You" }}>
        <p className="text-red-700">{error}</p>
        <Link href="/cabinetry" className="btn-secondary mt-4 inline-flex">
          Back
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <Link href="/cabinetry" className="text-sm text-[var(--sage)] hover:text-[var(--ink)]">
        ← Cabinetry
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">
            {opportunity.project.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--sage)]">
            {opportunity.customer.name} · {opportunity.productLine?.name || "No product line"} · v
            {opportunity.version}
          </p>
        </div>
        <Link href={`/projects/${opportunity.project.id}`} className="btn-secondary">
          Open job
        </Link>
      </div>

      {(error || message) && (
        <div
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {error || message}
        </div>
      )}

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        {[
          ["Stage", opportunity.stage.replace(/_/g, " ")],
          ["Scope", opportunity.supplyScope?.replace(/_/g, " ") || "—"],
          ["Construction", opportunity.constructionType?.replace(/_/g, " ") || "—"],
          ["Address", opportunity.projectAddress || "—"],
          ["Builder", opportunity.builderName || "—"],
          ["Architect", opportunity.architectName || "—"],
          ["Designer", opportunity.designerName || "—"],
          ["Tax status", opportunity.taxStatus || "—"],
        ].map(([k, v]) => (
          <div key={k} className="border-b border-[var(--line)] pb-2">
            <dt className="text-xs text-[var(--sage)]">{k}</dt>
            <dd className="font-medium text-[var(--ink)]">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Advance stage</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CABINETRY_STAGES.filter((s) => !["LOST", "EXPIRED"].includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              disabled={busy || opportunity.stage === s}
              onClick={() => setStage(s)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                opportunity.stage === s
                  ? "bg-[var(--copper)] text-white"
                  : "border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--mist)]"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 border border-[var(--line)] bg-[#faf7f2] p-4 text-sm text-[var(--sage)]">
        <p className="font-medium text-[var(--ink)]">Coming next in Phase 1</p>
        <p className="mt-1">
          Document upload categories, AI extraction + human review, cabinet schedule, catalog
          pricing, clarifications, proposal PDF, and deposit checkout.
        </p>
      </section>
    </AppShell>
  );
}
