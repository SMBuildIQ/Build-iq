"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/AppNav";
import { useMe } from "@/hooks/useMe";
import { formatCurrencyExact } from "@/lib/format";

type Line = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  spruceSku: string | null;
};

type Section = {
  id: string;
  category: string;
  title: string;
  notes: string | null;
  subtotal: number;
  lines: Line[];
};

type Proposal = {
  id: string;
  number: string;
  title: string;
  status: string;
  version: number;
  intro: string | null;
  scopeNotes: string | null;
  exclusions: string | null;
  terms: string | null;
  validUntil: string | null;
  depositPct: number;
  materialSubtotal: number;
  laborSubtotal: number;
  wasteSubtotal: number;
  contingencyAmount: number;
  overheadAmount: number;
  profitAmount: number;
  taxAmount: number;
  grandTotal: number;
  depositAmount: number;
  publicToken: string;
  customerName: string | null;
  customerEmail: string | null;
  projectAddress: string | null;
  sentAt: string | null;
  sections: Section[];
  project: { id: string; name: string } | null;
  customer: { id: string; name: string; email: string | null } | null;
  acceptance: {
    decision: string;
    signerName: string;
    signerEmail: string | null;
    createdAt: string;
  } | null;
};

export default function ProposalDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user } = useMe();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    intro: "",
    customerName: "",
    customerEmail: "",
    projectAddress: "",
    depositPct: 30,
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not load proposal");
      return;
    }
    setProposal(data.proposal);
    setEmail(data.proposal.customerEmail || "");
    setDraft({
      title: data.proposal.title,
      intro: data.proposal.intro || "",
      customerName: data.proposal.customerName || "",
      customerEmail: data.proposal.customerEmail || "",
      projectAddress: data.proposal.projectAddress || "",
      depositPct: Math.round((data.proposal.depositPct || 0.3) * 100),
    });
    setError("");
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError("");
    const res = await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        intro: draft.intro,
        customerName: draft.customerName,
        customerEmail: draft.customerEmail,
        projectAddress: draft.projectAddress,
        depositPct: draft.depositPct / 100,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setProposal(data.proposal);
    setEditing(false);
    setMessage("Proposal updated.");
  }

  async function sendProposal() {
    setBusy("send");
    setError("");
    setMessage("");
    const res = await fetch(`/api/proposals/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Send failed");
      return;
    }
    setProposal(data.proposal);
    setMessage(`Sent. Customer link: ${data.publicUrl}`);
  }

  if (!proposal && !error) {
    return (
      <AppShell user={user || { name: "You" }}>
        <p className="text-sm text-[var(--sage)]">Loading proposal…</p>
      </AppShell>
    );
  }

  if (!proposal) {
    return (
      <AppShell user={user || { name: "You" }}>
        <p className="text-sm text-red-700">{error}</p>
        <Link href="/proposals" className="mt-4 inline-block text-sm text-[var(--copper-deep)]">
          ← Proposals
        </Link>
      </AppShell>
    );
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${proposal.publicToken}`
      : `/p/${proposal.publicToken}`;

  return (
    <AppShell user={user || { name: "You" }}>
      <div className="mb-4">
        <Link href="/proposals" className="text-sm text-[var(--sage)] hover:text-[var(--copper-deep)]">
          ← Proposals
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-[var(--sage)]">{proposal.number}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-[var(--ink)]">
            {proposal.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={proposal.status} />
            <span className="text-xs text-[var(--sage)]">v{proposal.version}</span>
            {proposal.project && (
              <Link
                href={`/projects/${proposal.project.id}`}
                className="text-xs text-[var(--copper-deep)] underline-offset-2 hover:underline"
              >
                {proposal.project.name}
              </Link>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-semibold text-[var(--copper-deep)]">
            {formatCurrencyExact(proposal.grandTotal)}
          </p>
          <p className="text-xs text-[var(--sage)]">
            Deposit {formatCurrencyExact(proposal.depositAmount)} (
            {Math.round(proposal.depositPct * 100)}%)
          </p>
        </div>
      </div>

      {(error || message) && (
        <div
          className={`mb-4 break-all rounded-md px-4 py-3 text-sm ${
            error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`/api/proposals/${id}/pdf`} className="btn-secondary !px-4 !py-2 !text-sm">
          Download PDF
        </a>
        {proposal.status !== "ACCEPTED" && (
          <button
            type="button"
            className="btn-secondary !px-4 !py-2 !text-sm"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Cancel edit" : "Edit"}
          </button>
        )}
        <button
          type="button"
          className="btn-secondary !px-4 !py-2 !text-sm"
          onClick={() => {
            navigator.clipboard?.writeText(publicUrl);
            setMessage("Customer link copied.");
          }}
        >
          Copy customer link
        </button>
        {proposal.status !== "ACCEPTED" && (
          <button
            type="button"
            className="text-sm text-red-700/80 hover:text-red-800"
            disabled={!!busy}
            onClick={async () => {
              if (!confirm("Delete this proposal?")) return;
              await fetch(`/api/proposals/${id}`, { method: "DELETE" });
              router.push("/proposals");
            }}
          >
            Delete
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={saveEdits} className="mb-8 grid gap-3 border border-[var(--line)] bg-white p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="label">Title</span>
            <input
              className="input-field"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="label">Customer name</span>
            <input
              className="input-field"
              value={draft.customerName}
              onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="label">Customer email</span>
            <input
              className="input-field"
              type="email"
              value={draft.customerEmail}
              onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="label">Job address</span>
            <input
              className="input-field"
              value={draft.projectAddress}
              onChange={(e) => setDraft({ ...draft, projectAddress: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="label">Deposit %</span>
            <input
              className="input-field"
              type="number"
              min={0}
              max={100}
              value={draft.depositPct}
              onChange={(e) => setDraft({ ...draft, depositPct: Number(e.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="label">Introduction</span>
            <textarea
              className="input-field min-h-24"
              value={draft.intro}
              onChange={(e) => setDraft({ ...draft, intro: e.target.value })}
            />
          </label>
          <button type="submit" className="btn-copper w-fit" disabled={busy === "save"}>
            {busy === "save" ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      <section className="mb-8 border border-[var(--line)] bg-white p-4">
        <h2 className="font-display text-xl font-semibold">Send to customer</h2>
        <p className="mt-1 text-sm text-[var(--sage)]">
          Emails the secure accept link (and you can share the PDF). Works with Resend when keyed;
          otherwise logs to console in development.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="label">Email</span>
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </label>
          <button
            type="button"
            className="btn-copper"
            disabled={!!busy || proposal.status === "ACCEPTED"}
            onClick={sendProposal}
          >
            {busy === "send" ? "Sending…" : "Send proposal"}
          </button>
        </div>
        {proposal.acceptance && (
          <p className="mt-4 text-sm text-emerald-800">
            {proposal.acceptance.decision} by {proposal.acceptance.signerName} on{" "}
            {new Date(proposal.acceptance.createdAt).toLocaleString()}
          </p>
        )}
      </section>

      {proposal.intro && (
        <section className="mb-8">
          <h2 className="font-display text-xl font-semibold">Introduction</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{proposal.intro}</p>
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-display text-xl font-semibold">Categories</h2>
        <ul className="mt-4 space-y-6">
          {proposal.sections.map((s) => (
            <li key={s.id} className="border border-[var(--line)] bg-white">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] bg-[var(--mist)]/40 px-4 py-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{s.title}</h3>
                  {s.notes && <p className="mt-1 text-xs text-[var(--sage)]">{s.notes}</p>}
                </div>
                <p className="font-medium text-[var(--copper-deep)]">
                  {formatCurrencyExact(s.subtotal)}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-xs uppercase tracking-wider text-[var(--sage)]">
                      <th className="px-4 py-2 font-semibold">Item</th>
                      <th className="py-2 pr-3 font-semibold">Qty</th>
                      <th className="py-2 pr-3 font-semibold">Unit $</th>
                      <th className="py-2 pr-4 font-semibold">Extended</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.lines.map((l) => (
                      <tr key={l.id} className="border-b border-[var(--line)]">
                        <td className="px-4 py-2">
                          <p className="font-medium">{l.name}</p>
                          {l.description && (
                            <p className="text-xs text-[var(--sage)]">{l.description}</p>
                          )}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {l.quantity} {l.unit}
                        </td>
                        <td className="py-2 pr-3">{formatCurrencyExact(l.unitPrice)}</td>
                        <td className="py-2 pr-4">{formatCurrencyExact(l.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10 border border-[var(--line)] bg-white p-4">
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
    </AppShell>
  );
}
