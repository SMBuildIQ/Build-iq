"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/AppNav";
import { BotRunner } from "@/components/BotRunner";
import { formatCurrency, formatCurrencyExact, formatNumber } from "@/lib/format";
import { TRADE_ORDER } from "@/lib/materials/catalog";

type Material = {
  id: string;
  trade: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  laborHours: number;
  laborRate: number;
  wasteFactor: number;
  spruceSku: string | null;
  confidence: number | null;
};

type BidPackage = {
  id: string;
  trade: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  materials: Material[];
};

type Project = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  squareFeet: number | null;
  stories: number;
  status: string;
  notes: string | null;
  blueprints: {
    id: string;
    originalName: string;
    sheetType: string | null;
    sizeBytes: number;
    mimeType: string;
  }[];
  materials: Material[];
  estimate: {
    materialCost: number;
    laborCost: number;
    wasteCost: number;
    contingencyPct: number;
    contingencyCost: number;
    overheadPct: number;
    overheadCost: number;
    profitPct: number;
    profitAmount: number;
    taxPct: number;
    taxAmount: number;
    grandTotal: number;
    version: number;
  } | null;
  bidPackages: BidPackage[];
  spruceSyncs: { id: string; action: string; status: string; detail: string | null; createdAt: string }[];
};

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [botsOpen, setBotsOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load project");
      return;
    }
    setProject(data.project);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const materialsByTrade = useMemo(() => {
    if (!project) return [];
    const trades = [
      ...TRADE_ORDER.filter((t) => project.materials.some((m) => m.trade === t)),
      ...[...new Set(project.materials.map((m) => m.trade))].filter((t) => !TRADE_ORDER.includes(t)),
    ];
    return trades.map((trade) => ({
      trade,
      items: project.materials.filter((m) => m.trade === trade),
    }));
  }, [project]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setBusy("upload");
    setError("");
    setMessage("");
    const form = new FormData();
    list.forEach((f) => form.append("files", f));
    const res = await fetch(`/api/projects/${id}/blueprints`, { method: "POST", body: form });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Upload failed");
      return;
    }
    setMessage(
      `Uploaded ${data.blueprints.length} plan${data.blueprints.length === 1 ? "" : "s"}. AI bots are taking over…`
    );
    await load();
    setBotsOpen(true);
  }

  function runBots() {
    setError("");
    setMessage("");
    setBotsOpen(true);
  }

  async function exportExcel() {
    setBusy("export");
    setError("");
    const res = await fetch(`/api/projects/${id}/export`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBusy(null);
      setError(data.error || "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "estimate"}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(null);
    setMessage("Excel workbook downloaded.");
  }

  async function exportPdf() {
    setBusy("export-pdf");
    setError("");
    const res = await fetch(`/api/projects/${id}/export/pdf`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBusy(null);
      setError(data.error || "PDF export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name || "estimate"}-subtotals.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    setBusy(null);
    setMessage("Estimate subtotal PDF downloaded.");
  }

  async function spruceAction(action: "sync-pricing" | "submit-quote") {
    setBusy(action);
    setError("");
    setMessage("");
    const res = await fetch(`/api/projects/${id}/spruce`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Spruce sync failed");
      return;
    }
    if (action === "sync-pricing") {
      setMessage(`Synced pricing for ${data.updatedSkus} SKUs (${data.mode} mode).`);
    } else {
      setMessage(data.result?.message || "Quote submitted to Spruce.");
    }
    await load();
  }

  async function updateBidStatus(packageId: string, status: string) {
    setBusy(`bid-${packageId}`);
    const res = await fetch(`/api/projects/${id}/bids`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, status }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not update bid package");
      return;
    }
    await load();
  }

  if (!project && !error) {
    return (
      <AppShell user={{ name: "You" }}>
        <p className="py-10 text-[var(--sage)]">Loading project…</p>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell user={{ name: "You" }}>
        <p className="text-red-700">{error}</p>
        <Link href="/dashboard" className="btn-secondary mt-4 inline-flex">
          Back to projects
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell user={{ name: "You" }}>
        <div className="flex flex-col gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-[var(--sage)] hover:text-[var(--ink)]">
              ← Projects
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-2 text-sm text-[var(--sage)]">
              {[project.address, project.city, project.state, project.zip].filter(Boolean).join(", ") ||
                "Address TBD"}
              {project.squareFeet ? ` · ${project.squareFeet.toLocaleString()} sf` : ""}
              {` · ${project.stories} stor${project.stories === 1 ? "y" : "ies"}`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={runBots}
              disabled={!!busy || botsOpen}
              className="btn-copper !py-3"
            >
              {botsOpen ? "Bots running…" : "Run AI bots"}
            </button>
            <button onClick={exportExcel} disabled={!!busy || !project.materials.length} className="btn-secondary !py-3">
              {busy === "export" ? "Exporting…" : "Export Excel"}
            </button>
            <button
              onClick={exportPdf}
              disabled={!!busy || !project.materials.length}
              className="btn-secondary !py-3"
            >
              {busy === "export-pdf" ? "Building PDF…" : "Export PDF"}
            </button>
            <button
              onClick={() => spruceAction("submit-quote")}
              disabled={!!busy || !project.materials.length}
              className="btn-primary !py-3"
            >
              {busy === "submit-quote" ? "Sending…" : "Send to Spruce"}
            </button>
          </div>
        </div>

        <BotRunner
          open={botsOpen}
          projectId={id}
          onClose={() => setBotsOpen(false)}
          onComplete={() => {
            load();
            setMessage("AI bots finished — estimate, bids, cart, and Spruce quote are ready.");
          }}
        />

        {(error || message) && (
          <div
            className={`mt-6 rounded-md px-4 py-3 text-sm ${
              error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <h2 className="font-display text-2xl font-semibold">Blueprints</h2>
            <p className="mt-1 text-sm text-[var(--sage)]">
              Upload plans — AI bots automatically run takeoff, estimate, bids, cart packages, and Spruce sync.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
              }}
              className={`mt-4 border border-dashed px-6 py-10 text-center transition ${
                dragOver ? "border-[var(--copper)] bg-[var(--copper)]/5" : "border-[var(--line)]"
              }`}
            >
              <p className="font-medium text-[var(--ink)]">Drop blueprints here</p>
              <p className="mt-1 text-sm text-[var(--sage)]">PDF, PNG, JPG, or DWG</p>
              <label className="btn-secondary mt-4 cursor-pointer">
                {busy === "upload" ? "Uploading…" : "Choose files"}
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.dwg,.webp"
                  className="hidden"
                  onChange={(e) => e.target.files && uploadFiles(e.target.files)}
                />
              </label>
            </div>

            {project.blueprints.length > 0 && (
              <ul className="mt-4 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {project.blueprints.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium text-[var(--ink)]">{b.originalName}</p>
                      <p className="text-[var(--sage)]">
                        {b.sheetType || "General"} · {(b.sizeBytes / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold">Cost estimate</h2>
            {project.estimate ? (
              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ["Materials", project.estimate.materialCost],
                  ["Waste", project.estimate.wasteCost],
                  ["Labor", project.estimate.laborCost],
                  [`Contingency (${(project.estimate.contingencyPct * 100).toFixed(0)}%)`, project.estimate.contingencyCost],
                  [`Overhead (${(project.estimate.overheadPct * 100).toFixed(0)}%)`, project.estimate.overheadCost],
                  [`Profit (${(project.estimate.profitPct * 100).toFixed(0)}%)`, project.estimate.profitAmount],
                  [`Tax (${(project.estimate.taxPct * 100).toFixed(1)}%)`, project.estimate.taxAmount],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between border-b border-[var(--line)] py-2">
                    <dt className="text-[var(--sage)]">{label}</dt>
                    <dd className="font-medium">{formatCurrencyExact(value as number)}</dd>
                  </div>
                ))}
                <div className="flex justify-between pt-3">
                  <dt className="font-display text-lg font-semibold">Grand total</dt>
                  <dd className="font-display text-2xl font-semibold text-[var(--copper-deep)]">
                    {formatCurrency(project.estimate.grandTotal)}
                  </dd>
                </div>
                <p className="text-xs text-[var(--sage)]">Version {project.estimate.version}</p>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-[var(--sage)]">
                Run AI takeoff to generate a cost estimate from uploaded blueprints.
              </p>
            )}

            <div className="mt-8">
              <h3 className="font-display text-xl font-semibold">ECI Spruce</h3>
              <p className="mt-1 text-sm text-[var(--sage)]">
                Pull live catalog pricing or submit a materials quote.{" "}
                <Link href="/settings/spruce" className="text-[var(--copper-deep)] underline-offset-2 hover:underline">
                  Configure connection
                </Link>
              </p>
              <button
                onClick={() => spruceAction("sync-pricing")}
                disabled={!!busy || !project.materials.length}
                className="btn-secondary mt-3"
              >
                {busy === "sync-pricing" ? "Syncing…" : "Sync Spruce pricing"}
              </button>

              {project.spruceSyncs?.length > 0 && (
                <ul className="mt-4 space-y-2 text-xs text-[var(--sage)]">
                  {project.spruceSyncs.slice(0, 4).map((s) => (
                    <li key={s.id}>
                      <span className="font-medium text-[var(--ink-soft)]">{s.action}</span> · {s.status}
                      {s.detail ? ` — ${s.detail}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {project.materials.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold">Material takeoff</h2>
            <p className="mt-1 text-sm text-[var(--sage)]">
              {project.materials.length} line items identified across {materialsByTrade.length} trades
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--ink)] text-xs uppercase tracking-wider text-[var(--sage)]">
                    <th className="py-3 pr-3 font-semibold">Trade / Material</th>
                    <th className="py-3 pr-3 font-semibold">Qty</th>
                    <th className="py-3 pr-3 font-semibold">Unit cost</th>
                    <th className="py-3 pr-3 font-semibold">Labor</th>
                    <th className="py-3 pr-3 font-semibold">SKU</th>
                    <th className="py-3 font-semibold">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {materialsByTrade.map((group) => (
                    <Fragment key={group.trade}>
                      <tr className="bg-[var(--paper-deep)]/60">
                        <td colSpan={6} className="py-2 font-display text-base font-semibold">
                          {group.trade}
                        </td>
                      </tr>
                      {group.items.map((m) => (
                        <tr key={m.id} className="border-b border-[var(--line)]">
                          <td className="py-2.5 pr-3">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-xs text-[var(--sage)]">{m.category}</p>
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {formatNumber(m.quantity)} {m.unit}
                          </td>
                          <td className="py-2.5 pr-3">{formatCurrencyExact(m.unitCost)}</td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            {formatNumber(m.laborHours)} hrs
                          </td>
                          <td className="py-2.5 pr-3 font-mono text-xs">{m.spruceSku}</td>
                          <td className="py-2.5">
                            {m.confidence != null ? `${Math.round(m.confidence * 100)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {project.bidPackages.length > 0 && (
          <section className="mt-14 mb-10">
            <h2 className="font-display text-2xl font-semibold">Subcontractor bid packages</h2>
            <p className="mt-1 text-sm text-[var(--sage)]">
              Scope packages generated per trade from the AI takeoff
            </p>

            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {project.bidPackages.map((pkg) => (
                <li key={pkg.id} className="border border-[var(--line)] bg-white/40 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-semibold">{pkg.trade}</h3>
                      <p className="mt-1 text-sm text-[var(--sage)] line-clamp-2">{pkg.description}</p>
                    </div>
                    <StatusBadge status={pkg.status} />
                  </div>
                  <p className="mt-3 text-xs text-[var(--sage)]">
                    {pkg.materials.length} items
                    {pkg.dueDate ? ` · Due ${new Date(pkg.dueDate).toLocaleDateString()}` : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {pkg.status === "DRAFT" && (
                      <button
                        className="btn-secondary !px-3 !py-1.5 !text-xs"
                        disabled={!!busy}
                        onClick={() => updateBidStatus(pkg.id, "SENT")}
                      >
                        Mark sent
                      </button>
                    )}
                    {pkg.status === "SENT" && (
                      <button
                        className="btn-copper !px-3 !py-1.5 !text-xs"
                        disabled={!!busy}
                        onClick={() => updateBidStatus(pkg.id, "AWARDED")}
                      >
                        Award
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="pb-4">
          <button
            className="text-sm text-red-700/80 hover:text-red-800"
            onClick={async () => {
              if (!confirm("Delete this project?")) return;
              await fetch(`/api/projects/${id}`, { method: "DELETE" });
              router.push("/dashboard");
            }}
          >
            Delete project
          </button>
        </div>
    </AppShell>
  );
}
