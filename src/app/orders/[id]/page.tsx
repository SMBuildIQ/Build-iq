"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyExact } from "@/lib/format";
import { walletLabel } from "@/lib/commerce/wallet-label";

type SequenceStep = { step: string; label: string; detail: string };

type Order = {
  id: string;
  orderNumber: string;
  trackingStep: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  tax: number;
  total: number;
  shipToName: string | null;
  shipToAddress: string | null;
  shipToCity: string | null;
  shipToState: string | null;
  shipToZip: string | null;
  items: {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    spruceSku: string | null;
  }[];
  tracking: { id: string; step: string; label: string; detail: string | null; createdAt: string }[];
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    setUser(me.user);
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Order not found");
      return;
    }
    setOrder(data.order);
    setSequence(data.sequence || []);
    setCurrentIndex(data.currentIndex ?? 0);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function advance() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not advance tracking");
      return;
    }
    setOrder(data.order);
    setSequence(data.sequence || []);
    setCurrentIndex(data.currentIndex ?? 0);
  }

  if (!order && !error) {
    return (
      <AppShell user={user || { name: "You" }}>
        <p className="text-[var(--sage)]">Loading order…</p>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell user={user || { name: "You" }}>
        <p className="text-red-700">{error}</p>
        <Link href="/orders" className="btn-secondary mt-4 inline-flex">
          Back to orders
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <Link href="/orders" className="text-sm text-[var(--sage)]">
        ← Orders
      </Link>
      <p className="mt-3 font-mono text-xs text-[var(--sage)]">{order.orderNumber}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold">Tracking</h1>
      <p className="mt-1 text-sm text-[var(--sage)]">
        {formatCurrencyExact(order.total)} · {order.paymentStatus}
        {order.paymentMethod ? ` · ${walletLabel(order.paymentMethod)}` : ""}
      </p>

      <ol className="mt-8 space-y-0">
        {sequence.map((step, idx) => {
          const done = idx <= currentIndex;
          const current = idx === currentIndex;
          return (
            <li key={step.step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-[var(--copper)] text-white"
                      : "border border-[var(--line)] bg-white text-[var(--sage)]"
                  }`}
                >
                  {idx + 1}
                </span>
                {idx < sequence.length - 1 && (
                  <span className={`w-0.5 flex-1 min-h-6 ${done && idx < currentIndex ? "bg-[var(--copper)]" : "bg-[var(--line)]"}`} />
                )}
              </div>
              <div className={`pb-6 ${current ? "" : "opacity-70"}`}>
                <p className={`font-display text-lg font-semibold ${current ? "text-[var(--ink)]" : ""}`}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-sm text-[var(--sage)]">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {currentIndex < sequence.length - 1 && (
        <button
          onClick={advance}
          disabled={busy}
          className="btn-secondary w-full !py-3"
        >
          {busy ? "Updating…" : "Advance tracking (ops)"}
        </button>
      )}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Packages</h2>
        <ul className="mt-3 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white/50">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-[var(--sage)]">
                  {item.category} · qty {item.quantity}
                  {item.spruceSku ? ` · ${item.spruceSku}` : ""}
                </p>
              </div>
              <p className="font-semibold">{formatCurrencyExact(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 text-sm text-[var(--sage)]">
        <h2 className="font-display text-xl font-semibold text-[var(--ink)]">Ship to</h2>
        <p className="mt-2">
          {order.shipToName}
          <br />
          {order.shipToAddress}
          <br />
          {[order.shipToCity, order.shipToState, order.shipToZip].filter(Boolean).join(", ")}
        </p>
      </section>

      {order.tracking.length > 0 && (
        <section className="mt-8 mb-4">
          <h2 className="font-display text-xl font-semibold">Event log</h2>
          <ul className="mt-3 space-y-2 text-xs text-[var(--sage)]">
            {[...order.tracking].reverse().map((ev) => (
              <li key={ev.id}>
                <span className="font-semibold text-[var(--ink-soft)]">{ev.label}</span>
                {" · "}
                {new Date(ev.createdAt).toLocaleString()}
                {ev.detail ? ` — ${ev.detail}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
