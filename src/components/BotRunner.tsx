"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BOT_ROSTER, type BotEvent, type BotId } from "@/lib/ai/bots-client";

type BotState = {
  id: BotId;
  name: string;
  role: string;
  status: "pending" | "running" | "done" | "error";
  message?: string;
};

type Props = {
  open: boolean;
  projectId: string;
  onClose: () => void;
  onComplete: () => void;
};

export function BotRunner({ open, projectId, onClose, onComplete }: Props) {
  const [bots, setBots] = useState<BotState[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!open) return;

    setBots(
      BOT_ROSTER.map((b) => ({
        id: b.id,
        name: b.name,
        role: b.role,
        status: "pending",
      }))
    );
    setLog([]);
    setProgress(0);
    setDone(false);
    setError("");
    setSummary(null);

    const controller = new AbortController();
    let finished = false;

    function handleEvent(event: BotEvent) {
      if (typeof event.progress === "number") setProgress(event.progress);
      if (event.message) {
        setLog((prev) => [...prev.slice(-40), event.message]);
      }

      if (event.bot) {
        setBots((prev) =>
          prev.map((b) => {
            if (b.id !== event.bot) return b;
            if (event.type === "bot_start") return { ...b, status: "running", message: event.message };
            if (event.type === "bot_done") return { ...b, status: "done", message: event.message };
            if (event.type === "error") return { ...b, status: "error", message: event.message };
            if (event.type === "bot_progress") return { ...b, status: "running", message: event.message };
            return b;
          })
        );
      }

      if (event.type === "error") {
        setError(event.message);
      }

      if (event.type === "pipeline_done" && !finished) {
        finished = true;
        setDone(true);
        setSummary(event.data || null);
        onCompleteRef.current();
      }
    }

    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/bots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fillCart: true, syncSpruce: true }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Could not start AI bots");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.replace(/^data:\s*/, "");
            try {
              handleEvent(JSON.parse(json) as BotEvent);
            } catch {
              /* ignore partial */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Bot stream failed");
        }
      }
    })();

    return () => controller.abort();
  }, [open, projectId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--copper-deep)]">
              AI crew
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">
              {done ? "All bots finished" : "Bots streamlining your job"}
            </h2>
            <p className="mt-1 text-sm text-[var(--sage)]">
              Takeoff → estimate → bids → packages → Spruce — hands-free after plans upload.
            </p>
          </div>
          {(done || error) && (
            <button onClick={onClose} className="text-sm text-[var(--sage)] hover:text-[var(--ink)]">
              Close
            </button>
          )}
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--paper-deep)]">
          <div
            className="h-full rounded-full bg-[var(--copper)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-[var(--sage)]">{progress}%</p>

        <ul className="mt-5 space-y-2">
          {bots.map((bot) => (
            <li
              key={bot.id}
              className={`rounded-xl border px-3 py-2.5 ${
                bot.status === "running"
                  ? "border-[var(--copper)] bg-[var(--copper)]/5"
                  : "border-[var(--line)] bg-white/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{bot.name}</p>
                  <p className="text-[11px] text-[var(--sage)]">{bot.role}</p>
                </div>
                <StatusDot status={bot.status} />
              </div>
              {bot.message && (
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-soft)]">{bot.message}</p>
              )}
            </li>
          ))}
        </ul>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        {done && (
          <div className="mt-5 space-y-2">
            <p className="text-sm text-[var(--ink-soft)]">
              Your estimate, bid packages, and material cart are ready.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" className="btn-copper !rounded-xl !py-3 !text-center !text-sm">
                Open cart
              </Link>
              <button onClick={onClose} className="btn-secondary !rounded-xl !py-3 !text-sm">
                Review takeoff
              </button>
            </div>
            {summary && (
              <p className="text-[11px] text-[var(--sage)]">
                {(summary.materialCount as number) || 0} materials ·{" "}
                {(summary.bidPackageCount as number) || 0} bids · cart{" "}
                {(summary.cartCount as number) || 0}
              </p>
            )}
          </div>
        )}

        {!done && !error && (
          <div className="mt-4 max-h-28 overflow-y-auto rounded-xl bg-[var(--ink)]/95 p-3 font-mono text-[10px] leading-relaxed text-[var(--mist)]">
            {log.map((line, i) => (
              <p key={`${i}-${line.slice(0, 12)}`}>{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: BotState["status"] }) {
  const map = {
    pending: "bg-neutral-300",
    running: "bg-[var(--copper)] animate-pulse",
    done: "bg-emerald-500",
    error: "bg-red-500",
  };
  return <span className={`h-2.5 w-2.5 rounded-full ${map[status]}`} />;
}
