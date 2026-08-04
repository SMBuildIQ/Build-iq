"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarketingShell } from "@/components/AppShell";
import { formatCurrencyExact } from "@/lib/format";

type Line = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
};

type Section = {
  id: string;
  category: string;
  title: string;
  notes: string | null;
  subtotal: number;
  lines: Line[];
};

type PublicProposal = {
  id: string;
  number: string;
  title: string;
  status: string;
  intro: string | null;
  scopeNotes: string | null;
  exclusions: string | null;
  terms: string | null;
  validUntil: string | null;
  depositPct: number;
  grandTotal: number;
  depositAmount: number;
  materialSubtotal: number;
  laborSubtotal: number;
  wasteSubtotal: number;
  contingencyAmount: number;
  overheadAmount: number;
  profitAmount: number;
  taxAmount: number;
  customerName: string | null;
  projectAddress: string | null;
  company: { name: string; phone: string | null };
  project: { name: string } | null;
  sections: Section[];
  acceptance: { decision: string; signerName: string; createdAt: string } | null;
};

export default function PublicProposalPage() {
  const params = useParams();
  const token = params.token as string;
  const [proposal, setProposal] = useState<PublicProposal | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/proposals/public/${token}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Proposal not found");
      return;
    }
    setProposal(data.proposal);
    setError("");
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function respond(decision: "ACCEPTED" | "DECLINED") {
    if (!signerName.trim()) {
      setError("Please enter your name to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/proposals/public/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        signerName,
        signerEmail: signerEmail || null,
        signerTitle: signerTitle || null,
        notes: notes || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not record response");
      return;
    }
    setDone(decision === "ACCEPTED" ? "accepted" : "declined");
    await load();
  }

  if (error && !proposal) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <h1 className="font-display text-3xl font-semibold">Proposal unavailable</h1>
          <p className="mt-3 text-[var(--sage)]">{error}</p>
        </div>
      </MarketingShell>
    );
  }

  if (!proposal) {
    return (
      <MarketingShell>
        <div className="mx-auto max-w-2xl px-4 py-16">
          <p className="text-[var(--sage)]">Loading proposal…</p>
        </div>
      </MarketingShell>
    );
  }

  const locked = !!proposal.acceptance || proposal.status === "EXPIRED";

  return (
    <MarketingShell>
      <div className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--dark)] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(255,136,51,0.35), transparent 55%), radial-gradient(ellipse at 90% 80%, rgba(93,65,45,0.5), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--orange)]">
            {proposal.number} · Material proposal
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-wide">{proposal.title}</h1>
          <p className="mt-3 max-w-xl text-sm text-white/75">
            Prepared by Supply Monkey Lumber &amp; Materials Co for{" "}
            {proposal.customerName || "you"}
            {proposal.projectAddress ? ` · ${proposal.projectAddress}` : ""}
          </p>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Total</p>
              <p className="font-display text-3xl text-[var(--orange)]">
                {formatCurrencyExact(proposal.grandTotal)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">
                Deposit ({Math.round(proposal.depositPct * 100)}%)
              </p>
              <p className="font-display text-2xl">
                {formatCurrencyExact(proposal.depositAmount)}
              </p>
            </div>
            {proposal.validUntil && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/50">Valid through</p>
                <p className="text-sm">{new Date(proposal.validUntil).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <div className="mt-6">
            <a
              href={`/api/proposals/public/${token}/pdf`}
              className="btn-copper inline-flex !px-4 !py-2 !text-sm"
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {(error || done) && (
          <div
            className={`mb-6 rounded-md px-4 py-3 text-sm ${
              error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {error ||
              (done === "accepted"
                ? "Thank you — this proposal is accepted. Supply Monkey will follow up on deposit and scheduling."
                : "Your decline has been recorded. Contact us if you would like a revised proposal.")}
          </div>
        )}

        {proposal.intro && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-semibold text-[var(--ink)]">Introduction</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{proposal.intro}</p>
          </section>
        )}

        {proposal.scopeNotes && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-semibold">Scope</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">{proposal.scopeNotes}</p>
          </section>
        )}

        <section className="mb-10">
          <h2 className="font-display text-2xl font-semibold">By category</h2>
          <ul className="mt-6 space-y-8">
            {proposal.sections.map((s) => (
              <li key={s.id}>
                <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-[var(--line)] pb-2">
                  <div>
                    <h3 className="font-display text-xl font-semibold">{s.category}</h3>
                    {s.notes && <p className="mt-1 text-xs text-[var(--sage)]">{s.notes}</p>}
                  </div>
                  <p className="font-medium text-[var(--copper-deep)]">
                    {formatCurrencyExact(s.subtotal)}
                  </p>
                </div>
                <ul className="space-y-2 text-sm">
                  {s.lines.map((l) => (
                    <li key={l.id} className="flex justify-between gap-4">
                      <span>
                        <span className="font-medium">{l.name}</span>
                        <span className="text-[var(--sage)]">
                          {" "}
                          · {l.quantity} {l.unit}
                        </span>
                      </span>
                      <span className="whitespace-nowrap">{formatCurrencyExact(l.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10 border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Investment</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {(
              [
                ["Materials", proposal.materialSubtotal],
                ["Waste", proposal.wasteSubtotal],
                ["Labor", proposal.laborSubtotal],
                ["Contingency", proposal.contingencyAmount],
                ["Overhead", proposal.overheadAmount],
                ["Profit", proposal.profitAmount],
                ["Tax", proposal.taxAmount],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-[var(--sage)]">{label}</dt>
                <dd>{formatCurrencyExact(value)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-[var(--line)] pt-3">
              <dt className="font-display text-lg font-semibold">Total</dt>
              <dd className="font-display text-xl font-semibold text-[var(--copper-deep)]">
                {formatCurrencyExact(proposal.grandTotal)}
              </dd>
            </div>
          </dl>
        </section>

        {proposal.exclusions && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold">Exclusions</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
              {proposal.exclusions.split("\n").filter(Boolean).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {proposal.terms && (
          <section className="mb-10">
            <h2 className="font-display text-xl font-semibold">Terms</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ink-soft)]">
              {proposal.terms.split("\n").filter(Boolean).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-16 border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-xl font-semibold">
            {locked ? "Response recorded" : "Accept or decline"}
          </h2>
          {proposal.acceptance ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">
              {proposal.acceptance.decision} by {proposal.acceptance.signerName} on{" "}
              {new Date(proposal.acceptance.createdAt).toLocaleString()}
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-[var(--sage)]">
                Electronic acceptance agrees to the scope, exclusions, and commercial terms above.
                Deposit of {formatCurrencyExact(proposal.depositAmount)} is due upon acceptance.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="label">Full name</span>
                  <input
                    className="input-field"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    required
                    disabled={locked}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="label">Email</span>
                  <input
                    className="input-field"
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    disabled={locked}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="label">Title (optional)</span>
                  <input
                    className="input-field"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    disabled={locked}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="label">Notes (optional)</span>
                  <textarea
                    className="input-field min-h-20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={locked}
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-copper"
                  disabled={busy || locked}
                  onClick={() => respond("ACCEPTED")}
                >
                  {busy ? "Submitting…" : "Accept proposal"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={busy || locked}
                  onClick={() => respond("DECLINED")}
                >
                  Decline
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </MarketingShell>
  );
}
