"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PlanViewer, type MeasurementRow } from "@/components/PlanViewer";

type BlueprintDetail = {
  id: string;
  originalName: string;
  mimeType: string;
  sheetType: string | null;
  widthPx: number | null;
  heightPx: number | null;
  pixelsPerUnit: number | null;
  scaleUnit: string;
  scaleLabel: string | null;
  scanStatus: string;
  scanError: string | null;
  scannedAt: string | null;
  ocrText: string | null;
  ocrJson: string | null;
  visionJson: string | null;
  previewFilename: string | null;
};

export default function PlanWorkspacePage() {
  const params = useParams();
  const projectId = params.id as string;
  const blueprintId = params.blueprintId as string;

  const [blueprint, setBlueprint] = useState<BlueprintDetail | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [showOcr, setShowOcr] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprintId}/measurements`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load plan");
      return;
    }
    setBlueprint(data.blueprint);
    setMeasurements(data.measurements || []);
  }, [projectId, blueprintId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runScan() {
    setBusy("scan");
    setError("");
    setMessage("Scanning plan — rasterize, OCR, vision…");
    const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprintId}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runOcr: true, runVision: true }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "Scan failed");
      setMessage("");
      return;
    }
    setMessage(data.result?.message || "Scan complete.");
    await load();
  }

  const vision = (() => {
    if (!blueprint?.visionJson) return null;
    try {
      return JSON.parse(blueprint.visionJson) as {
        rawSummary?: string;
        rooms?: string[];
        scaleHint?: string;
        measuredHints?: { label: string; quantity: number; unit: string }[];
        materials?: unknown[];
      };
    } catch {
      return null;
    }
  })();

  const ocrMeta = (() => {
    if (!blueprint?.ocrJson) return null;
    try {
      return JSON.parse(blueprint.ocrJson) as {
        engine?: string;
        confidence?: number;
        dimensions?: { raw: string; feet: number }[];
      };
    } catch {
      return null;
    }
  })();

  const imageUrl = `/api/projects/${projectId}/blueprints/${blueprintId}/file?preview=1`;
  const canPreview =
    !!blueprint?.previewFilename ||
    (blueprint?.mimeType?.startsWith("image/") ?? false);

  if (!blueprint && !error) {
    return (
      <AppShell user={{ name: "You" }}>
        <p className="py-10 text-[var(--sage)]">Loading plan workspace…</p>
      </AppShell>
    );
  }

  return (
    <AppShell user={{ name: "You" }}>
      <div className="mb-4">
        <Link href={`/projects/${projectId}`} className="text-sm text-[var(--sage)] hover:text-[var(--ink)]">
          ← Back to project
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">
              {blueprint?.originalName || "Plan"}
            </h1>
            <p className="mt-1 text-sm text-[var(--sage)]">
              {blueprint?.sheetType || "Sheet"} · Scan: {blueprint?.scanStatus || "IDLE"}
              {blueprint?.scannedAt ? ` · ${new Date(blueprint.scannedAt).toLocaleString()}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={runScan}
            disabled={!!busy}
            className="btn-copper !py-3"
          >
            {busy === "scan" ? "Scanning…" : "Run OCR + Vision scan"}
          </button>
        </div>
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

      {blueprint?.scanError && (
        <p className="mb-4 text-sm text-red-700">{blueprint.scanError}</p>
      )}

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="border border-[var(--line)] bg-white p-4 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold">Vision findings</h2>
          {vision ? (
            <div className="mt-2 space-y-2 text-sm text-[var(--ink)]">
              {vision.scaleHint && <p>Scale hint: {vision.scaleHint}</p>}
              {vision.rooms?.length ? <p>Rooms: {vision.rooms.join(", ")}</p> : null}
              {vision.rawSummary && <p className="text-[var(--sage)]">{vision.rawSummary}</p>}
              {vision.measuredHints?.length ? (
                <ul className="list-inside list-disc text-[var(--sage)]">
                  {vision.measuredHints.slice(0, 8).map((h, i) => (
                    <li key={i}>
                      {h.label}: {h.quantity} {h.unit}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-[var(--sage)]">
                {(vision.materials as unknown[] | undefined)?.length || 0} catalog lines from vision
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--sage)]">
              No vision results yet. Run scan (requires OPENAI_API_KEY for GPT-4o drawing vision).
            </p>
          )}
        </div>
        <div className="border border-[var(--line)] bg-white p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-lg font-semibold">OCR / sheet text</h2>
            <button
              type="button"
              className="text-sm text-[var(--copper-deep)] hover:underline"
              onClick={() => setShowOcr((v) => !v)}
            >
              {showOcr ? "Hide" : "Show"} text
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--sage)]">
            Engine: {ocrMeta?.engine || "—"}
            {ocrMeta?.confidence != null ? ` · confidence ${(ocrMeta.confidence * 100).toFixed(0)}%` : ""}
            {ocrMeta?.dimensions?.length ? ` · ${ocrMeta.dimensions.length} dimension token(s)` : ""}
          </p>
          {ocrMeta?.dimensions?.length ? (
            <p className="mt-2 text-sm text-[var(--ink)]">
              Dimensions:{" "}
              {ocrMeta.dimensions
                .slice(0, 12)
                .map((d) => `${d.raw} (~${d.feet} ft)`)
                .join(" · ")}
            </p>
          ) : null}
          {showOcr && (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap border border-[var(--line)] bg-[#faf7f2] p-3 text-xs text-[var(--ink)]">
              {blueprint?.ocrText || "(empty)"}
            </pre>
          )}
        </div>
      </div>

      <h2 className="mb-3 font-display text-2xl font-semibold">Measuring tools</h2>
      {!canPreview && blueprint?.mimeType === "application/pdf" ? (
        <div className="border border-[var(--line)] bg-[#faf7f2] p-6 text-sm text-[var(--sage)]">
          <p>Run OCR + Vision scan to generate a raster preview for measuring.</p>
          <p className="mt-2">
            Or open the original:{" "}
            <a
              className="text-[var(--copper-deep)] underline"
              href={`/api/projects/${projectId}/blueprints/${blueprintId}/file`}
              target="_blank"
              rel="noreferrer"
            >
              Download / view PDF
            </a>
          </p>
        </div>
      ) : (
        <PlanViewer
          projectId={projectId}
          blueprintId={blueprintId}
          imageUrl={
            blueprint?.previewFilename
              ? imageUrl
              : `/api/projects/${projectId}/blueprints/${blueprintId}/file`
          }
          widthPx={blueprint?.widthPx || null}
          heightPx={blueprint?.heightPx || null}
          pixelsPerUnit={blueprint?.pixelsPerUnit || null}
          scaleLabel={blueprint?.scaleLabel || null}
          measurements={measurements}
          onRefresh={load}
          onMessage={(msg, isError) => {
            if (isError) {
              setError(msg);
              setMessage("");
            } else {
              setMessage(msg);
              setError("");
            }
          }}
        />
      )}
    </AppShell>
  );
}
