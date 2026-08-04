"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyExact } from "@/lib/format";

type CartItem = {
  id: string;
  quantity: number;
  package: {
    id: string;
    name: string;
    category: string;
    unitPrice: number;
    spruceSku: string | null;
  };
};

type Totals = { subtotal: number; tax: number; total: number; itemCount: number };

export default function CartPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<Totals>({ subtotal: 0, tax: 0, total: 0, itemCount: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  async function load() {
    const me = await fetch("/api/auth/me").then((r) => r.json());
    if (!me.user) {
      router.push("/login");
      return;
    }
    setUser(me.user);
    const data = await fetch("/api/cart").then((r) => r.json());
    setItems(data.cart?.items || []);
    setTotals(data.totals || { subtotal: 0, tax: 0, total: 0, itemCount: 0 });
  }

  useEffect(() => {
    load();
  }, [router]);

  async function setQty(itemId: string, quantity: number) {
    const res = await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity }),
    });
    const data = await res.json();
    if (res.ok) {
      setItems(data.cart?.items || []);
      setTotals(data.totals);
    }
  }

  async function checkout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipToName: form.get("shipToName"),
        shipToAddress: form.get("shipToAddress"),
        shipToCity: form.get("shipToCity"),
        shipToState: form.get("shipToState"),
        shipToZip: form.get("shipToZip"),
        notes: form.get("notes") || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Checkout failed");
      return;
    }
    router.push(`/orders/${data.order.id}`);
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">Cart</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Review takeoff packages, then pay to start the fulfillment tracking sequence.
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] px-5 py-12 text-center">
          <p className="font-display text-xl font-semibold">Cart is empty</p>
          <Link href="/shop" className="btn-copper mt-5 inline-flex !rounded-xl">
            Browse packages
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--copper-deep)]">
                      {item.package.category}
                    </p>
                    <p className="font-display text-lg font-semibold">{item.package.name}</p>
                    <p className="text-sm text-[var(--sage)]">
                      {formatCurrencyExact(item.package.unitPrice)} each
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrencyExact(item.quantity * item.package.unitPrice)}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    className="h-9 w-9 rounded-lg border border-[var(--line)]"
                    onClick={() => setQty(item.id, Math.max(0, item.quantity - 1))}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    className="h-9 w-9 rounded-lg border border-[var(--line)]"
                    onClick={() => setQty(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button
                    className="ml-auto text-xs text-red-700"
                    onClick={() => setQty(item.id, 0)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2 rounded-2xl border border-[var(--line)] bg-white/55 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--sage)]">Subtotal</dt>
              <dd>{formatCurrencyExact(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--sage)]">Tax (6.5%)</dt>
              <dd>{formatCurrencyExact(totals.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--line)] pt-2">
              <dt className="font-display text-lg font-semibold">Total</dt>
              <dd className="font-display text-xl font-semibold text-[var(--copper-deep)]">
                {formatCurrencyExact(totals.total)}
              </dd>
            </div>
          </dl>

          {!checkoutOpen ? (
            <button
              onClick={() => setCheckoutOpen(true)}
              className="btn-copper mt-5 w-full !rounded-xl !py-3.5"
            >
              Checkout & pay
            </button>
          ) : (
            <form onSubmit={checkout} className="mt-5 space-y-3 rounded-2xl border border-[var(--line)] bg-white/60 p-4">
              <p className="font-display text-lg font-semibold">Delivery & payment</p>
              <p className="text-xs text-[var(--sage)]">
                Payments use Stripe when configured; otherwise mock payment confirms instantly for demo.
              </p>
              <input name="shipToName" required placeholder="Site / contact name" className="input-field !rounded-xl !py-3" defaultValue={user?.companyName || ""} />
              <input name="shipToAddress" required placeholder="Jobsite address" className="input-field !rounded-xl !py-3" />
              <div className="grid grid-cols-3 gap-2">
                <input name="shipToCity" required placeholder="City" className="input-field !rounded-xl !py-3" />
                <input name="shipToState" required placeholder="ST" className="input-field !rounded-xl !py-3" />
                <input name="shipToZip" required placeholder="ZIP" className="input-field !rounded-xl !py-3" />
              </div>
              <textarea name="notes" rows={2} placeholder="Delivery notes" className="input-field !rounded-xl" />
              {error && <p className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy} className="btn-copper w-full !rounded-xl !py-3.5">
                {busy ? "Processing…" : `Pay ${formatCurrencyExact(totals.total)}`}
              </button>
            </form>
          )}
        </>
      )}
    </AppShell>
  );
}
