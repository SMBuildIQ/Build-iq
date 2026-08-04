"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const SECTIONS = [
  { name: "Opportunities", note: "Linked to company, customer, and project" },
  { name: "Estimates", note: "Catalog-priced schedule after AI review" },
  { name: "Proposals", note: "Versioned PDFs, approvals, acceptance" },
  { name: "Product Catalog", note: "Company catalog + CSV/XLSX import" },
  { name: "Pricing Rules", note: "Markup, margin, freight — not AI invent" },
  { name: "Finishes", note: "Editable finish options" },
  { name: "Door Styles", note: "Editable door-style options" },
  { name: "Accessories", note: "Pullouts, lighting, hardware, etc." },
  { name: "Proposal Templates", note: "Customer-facing display levels" },
  { name: "Reports", note: "Pipeline, margin, close rate" },
  { name: "Cabinetry Settings", note: "Product lines Mesa / Summit / Pinnacle" },
] as const;

export default function CabinetryHubPage() {
  return (
    <AppShell user={{ name: "You" }}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--copper-deep)]">
          Planned module
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">Cabinetry</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--sage)]">
          AI-assisted cabinetry proposals will live inside BuildIQ — same login, companies, projects,
          files, payments, and permissions. No separate SaaS.
        </p>
      </div>

      <div className="border border-[var(--line)] bg-[#faf7f2] px-4 py-3 text-sm text-[var(--ink)]">
        <p className="font-medium">Integration audit ready for review</p>
        <p className="mt-1 text-[var(--sage)]">
          Schema, AI extraction, proposals, and deposits are deferred until the plan is approved.
          See{" "}
          <code className="text-[var(--ink)]">CABINETRY_INTEGRATION_AUDIT.md</code> in the repo.
        </p>
        <p className="mt-2 text-xs text-[var(--sage)]">
          Missing platform pieces today: customers/contacts, generic files, proposals, portal,
          notifications, Stripe webhooks, Expo app, Postgres/RLS.
        </p>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Module sections</h2>
      <ul className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {SECTIONS.map((s) => (
          <li key={s.name} className="flex items-start justify-between gap-3 py-3 text-sm">
            <div>
              <p className="font-medium text-[var(--ink)]">{s.name}</p>
              <p className="text-[var(--sage)]">{s.note}</p>
            </div>
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--sage)]">
              Planned
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/modules/cabinetry" className="btn-secondary">
          Module status
        </Link>
        <Link href="/dashboard" className="btn-copper">
          Back to jobs
        </Link>
      </div>
    </AppShell>
  );
}
