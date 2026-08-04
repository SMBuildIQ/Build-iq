"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { formatCurrencyExact } from "@/lib/format";
import { PACKAGE_CATEGORIES } from "@/lib/materials/packages";

type Package = {
  id: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  contents: string[];
  unitPrice: number;
  leadDays: number;
  spruceSku: string | null;
};

export default function ShopPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json());
      if (!me.user) {
        router.push("/login");
        return;
      }
      setUser(me.user);
      const data = await fetch("/api/shop/packages").then((r) => r.json());
      setPackages(data.packages || []);
    })();
  }, [router]);

  const filtered = useMemo(
    () => (category === "All" ? packages : packages.filter((p) => p.category === category)),
    [packages, category]
  );

  async function addToCart(packageId: string) {
    setBusyId(packageId);
    setMessage("");
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, quantity: 1 }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.error || "Could not add to cart");
      return;
    }
    setMessage("Added to cart");
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">Material packages</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Order takeoff packages for windows, doors, lumber, trusses, cabinetry, masonry stone, door hardware, and millwork.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {["All", ...PACKAGE_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              category === c
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-white/60 text-[var(--sage)] border border-[var(--line)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {message && <p className="mt-3 text-sm text-emerald-800">{message}</p>}

      <ul className="mt-5 space-y-3">
        {filtered.map((pkg) => (
          <li key={pkg.id} className="rounded-2xl border border-[var(--line)] bg-white/55 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--copper-deep)]">
                  {pkg.category}
                </p>
                <h2 className="mt-1 font-display text-xl font-semibold">{pkg.name}</h2>
                <p className="mt-1 text-sm text-[var(--sage)]">{pkg.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-xl font-semibold">{formatCurrencyExact(pkg.unitPrice)}</p>
                <p className="text-[10px] text-[var(--sage)]">{pkg.leadDays} day lead</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-[var(--ink-soft)]">
              {pkg.contents.slice(0, 4).map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] text-[var(--sage)]">{pkg.spruceSku}</p>
              <button
                onClick={() => addToCart(pkg.id)}
                disabled={busyId === pkg.id}
                className="btn-copper !rounded-xl !px-4 !py-2 !text-sm"
              >
                {busyId === pkg.id ? "Adding…" : "Add to cart"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
