"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type MeasureTool = "pan" | "calibrate" | "length" | "area" | "count";

export type PlanPoint = { x: number; y: number };

export type MeasurementRow = {
  id: string;
  type: string;
  label: string | null;
  pointsJson: string;
  value: number | null;
  unit: string | null;
};

type Props = {
  projectId: string;
  blueprintId: string;
  imageUrl: string;
  widthPx: number | null;
  heightPx: number | null;
  pixelsPerUnit: number | null;
  scaleLabel: string | null;
  measurements: MeasurementRow[];
  onRefresh: () => void;
  onMessage: (msg: string, isError?: boolean) => void;
};

function parsePoints(json: string): PlanPoint[] {
  try {
    return JSON.parse(json) as PlanPoint[];
  } catch {
    return [];
  }
}

export function PlanViewer({
  projectId,
  blueprintId,
  imageUrl,
  widthPx,
  heightPx,
  pixelsPerUnit,
  scaleLabel,
  measurements,
  onRefresh,
  onMessage,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [tool, setTool] = useState<MeasureTool>("pan");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState<PlanPoint[]>([]);
  const [calibrateFeet, setCalibrateFeet] = useState("10");
  const [label, setLabel] = useState("");
  const [imgSize, setImgSize] = useState({ w: widthPx || 0, h: heightPx || 0 });
  const [panning, setPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);

  const natural = imgSize.w > 0 ? imgSize : { w: 1200, h: 800 };

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.complete) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = "#1a1510";
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, 0, 0, natural.w, natural.h);

    const drawPoly = (pts: PlanPoint[], color: string, closed: boolean) => {
      if (!pts.length) return;
      ctx.strokeStyle = color;
      ctx.fillStyle = color + "33";
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      if (closed && pts.length > 2) ctx.closePath();
      ctx.stroke();
      if (closed && pts.length > 2) ctx.fill();
      for (const p of pts) {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(p.x, p.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    for (const m of measurements) {
      const pts = parsePoints(m.pointsJson);
      const color =
        m.type === "CALIBRATION"
          ? "#FF8833"
          : m.type === "AREA"
            ? "#3B82F6"
            : m.type === "COUNT"
              ? "#10B981"
              : "#F59E0B";
      drawPoly(pts, color, m.type === "AREA");
      if (m.type === "COUNT") {
        pts.forEach((p, i) => {
          ctx.fillStyle = "#fff";
          ctx.font = `${11 / zoom}px sans-serif`;
          ctx.fillText(String(i + 1), p.x + 6 / zoom, p.y - 6 / zoom);
        });
      }
    }

    if (draft.length) {
      drawPoly(draft, "#FF8833", tool === "area");
    }

    ctx.restore();
  }, [draft, measurements, natural.h, natural.w, offset.x, offset.y, tool, zoom]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Fit to container
      const el = containerRef.current;
      if (el) {
        const fit = Math.min(el.clientWidth / img.naturalWidth, el.clientHeight / img.naturalHeight, 1);
        setZoom(Math.max(0.15, fit * 0.95));
        setOffset({
          x: (el.clientWidth - img.naturalWidth * fit * 0.95) / 2,
          y: (el.clientHeight - img.naturalHeight * fit * 0.95) / 2,
        });
      }
    };
    img.onerror = () => onMessage("Could not load plan preview. Run OCR/Vision scan first.", true);
    img.src = imageUrl;
  }, [imageUrl, onMessage]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const onResize = () => redraw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redraw]);

  const toPlanPoint = (clientX: number, clientY: number): PlanPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;
    return { x, y };
  };

  async function saveMeasurement(type: string, points: PlanPoint[], extra?: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/blueprints/${blueprintId}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        points,
        label: label || undefined,
        ...extra,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      onMessage(data.error || "Could not save measurement", true);
      return;
    }
    setDraft([]);
    setLabel("");
    onMessage(
      type === "CALIBRATION"
        ? `Scale set — ${Number(data.pixelsPerUnit).toFixed(2)} px/ft`
        : `Saved ${type.toLowerCase()} measurement`
    );
    onRefresh();
  }

  function finishDraft() {
    if (tool === "calibrate" && draft.length >= 2) {
      const feet = Number(calibrateFeet);
      if (!(feet > 0)) {
        onMessage("Enter a positive length in feet for calibration.", true);
        return;
      }
      void saveMeasurement("CALIBRATION", draft.slice(0, 2), { realLength: feet, unit: "ft" });
      return;
    }
    if (tool === "length" && draft.length >= 2) {
      void saveMeasurement("LENGTH", draft.slice(0, 2));
      return;
    }
    if (tool === "area" && draft.length >= 3) {
      void saveMeasurement("AREA", draft);
      return;
    }
    if (tool === "count" && draft.length >= 1) {
      void saveMeasurement("COUNT", draft);
      return;
    }
    onMessage("Not enough points for this tool.", true);
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === "pan" || e.button === 1) {
      setPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      return;
    }
    const pt = toPlanPoint(e.clientX, e.clientY);
    if (!pt) return;
    if (tool === "calibrate" || tool === "length") {
      const next = [...draft, pt].slice(0, 2);
      setDraft(next);
      if (next.length === 2) {
        // wait for Finish / auto-save on second click for length
      }
      return;
    }
    if (tool === "area" || tool === "count") {
      setDraft((d) => [...d, pt]);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!panning) return;
    setOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.x),
      y: panStart.current.oy + (e.clientY - panStart.current.y),
    });
  };

  const onPointerUp = () => setPanning(false);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.min(8, Math.max(0.1, z * factor)));
  };

  async function removeMeasurement(measurementId: string) {
    setBusy(true);
    const res = await fetch(
      `/api/projects/${projectId}/blueprints/${blueprintId}/measurements?measurementId=${measurementId}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      onMessage("Could not delete measurement", true);
      return;
    }
    onRefresh();
  }

  const tools: { id: MeasureTool; label: string; hint: string }[] = useMemo(
    () => [
      { id: "pan", label: "Pan", hint: "Drag to move" },
      { id: "calibrate", label: "Scale", hint: "2 clicks + real feet" },
      { id: "length", label: "Length", hint: "2 clicks" },
      { id: "area", label: "Area", hint: "Polygon, then Finish" },
      { id: "count", label: "Count", hint: "Click each item, Finish" },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 border border-[var(--line)] bg-[#2a2118] px-3 py-2">
          {tools.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTool(t.id);
                setDraft([]);
              }}
              className={`px-3 py-1.5 text-sm ${
                tool === t.id
                  ? "bg-[var(--copper)] text-white"
                  : "bg-transparent text-[var(--sand)] hover:bg-white/10"
              }`}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className="px-3 py-1.5 text-sm text-[var(--sand)] hover:bg-white/10"
            onClick={() => setZoom((z) => Math.min(8, z * 1.2))}
          >
            +
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-sm text-[var(--sand)] hover:bg-white/10"
            onClick={() => setZoom((z) => Math.max(0.1, z / 1.2))}
          >
            −
          </button>
          {(tool === "area" || tool === "count" || (tool === "calibrate" && draft.length >= 2) || (tool === "length" && draft.length >= 2)) && (
            <button
              type="button"
              disabled={busy}
              onClick={finishDraft}
              className="ml-auto bg-[var(--copper)] px-3 py-1.5 text-sm text-white"
            >
              Finish
            </button>
          )}
          {draft.length > 0 && (
            <button type="button" onClick={() => setDraft([])} className="px-3 py-1.5 text-sm text-[var(--sand)]">
              Clear draft
            </button>
          )}
        </div>

        {(tool === "calibrate" || tool === "length" || tool === "area" || tool === "count") && (
          <div className="flex flex-wrap items-end gap-3 border-x border-b border-[var(--line)] bg-[#faf7f2] px-3 py-2 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--sage)]">Label</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="border border-[var(--line)] bg-white px-2 py-1"
                placeholder="e.g. Living room"
              />
            </label>
            {tool === "calibrate" && (
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[var(--sage)]">Known length (ft)</span>
                <input
                  value={calibrateFeet}
                  onChange={(e) => setCalibrateFeet(e.target.value)}
                  className="w-28 border border-[var(--line)] bg-white px-2 py-1"
                  inputMode="decimal"
                />
              </label>
            )}
            <p className="pb-1 text-xs text-[var(--sage)]">
              {tool === "calibrate" && "Click two ends of a known dimension bar or wall, enter real feet, Finish."}
              {tool === "length" && "Click start and end. Scale must be calibrated for feet."}
              {tool === "area" && "Click polygon corners, then Finish for sf."}
              {tool === "count" && "Click each door/window/fixture, then Finish."}
            </p>
          </div>
        )}

        <div
          ref={containerRef}
          className="relative h-[min(70vh,720px)] w-full border border-[var(--line)] bg-[#1a1510]"
        >
          <canvas
            ref={canvasRef}
            className={`h-full w-full touch-none ${tool === "pan" ? "cursor-grab" : "cursor-crosshair"}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--sage)]">
          Scale:{" "}
          {pixelsPerUnit
            ? `${pixelsPerUnit.toFixed(2)} px/${"ft"} · ${scaleLabel || "calibrated"}`
            : "Not calibrated — use Scale tool"}
          {" · "}
          Zoom {(zoom * 100).toFixed(0)}%
        </p>
      </div>

      <aside className="w-full shrink-0 border border-[var(--line)] bg-white p-4 lg:w-72">
        <h3 className="font-display text-lg font-semibold">Measurements</h3>
        {measurements.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--sage)]">No measurements yet. Calibrate scale, then measure.</p>
        ) : (
          <ul className="mt-3 max-h-[60vh] space-y-2 overflow-auto text-sm">
            {measurements.map((m) => (
              <li key={m.id} className="border-b border-[var(--line)] pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--ink)]">{m.label || m.type}</p>
                    <p className="text-[var(--sage)]">
                      {m.type}
                      {m.value != null ? ` · ${m.value} ${m.unit || ""}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-red-700 hover:underline"
                    onClick={() => removeMeasurement(m.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
