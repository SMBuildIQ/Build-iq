"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyExact } from "@/lib/format";
import { stepMeta } from "@/lib/commerce/tracking";

type Order = {
  id: string;
  orderNumber: string;
  trackingStep: string;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; name: string; category: string; quantity: number }[];
};

export default function OrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.push("/login");
        return;
      }
      setUser(me.user);
      const data = await fetch("/api/orders").then((r) => r.json());
      setOrders(data.orders || []);
    })();
  }, [router]);

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">Order tracking</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Follow takeoff packages from payment through delivery.
      </p>

      {orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--line)] px-5 py-12 text-center">
          <p className="font-display text-xl font-semibold">No orders yet</p>
          <Link href="/shop" className="btn-copper mt-5 inline-flex">
            Shop packages
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => {
            const meta = stepMeta(order.trackingStep);
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="block surface p-4 transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-[var(--sage)]">{order.orderNumber}</p>
                      <p className="mt-1 font-display text-lg font-semibold">{meta.label}</p>
                      <p className="mt-1 text-xs text-[var(--sage)]">
                        {order.items.map((i) => i.category).join(" · ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrencyExact(order.total)}</p>
                      <p className="text-[10px] text-[var(--sage)]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
