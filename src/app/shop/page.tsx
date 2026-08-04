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
      <section className="site-topband">
        <div className="site-topband__inner px-5 py-5">
          <p className="site-topband__eyebrow">Supply Monkey packages</p>
          <h1 className="mt-2 font-display text-4xl text-white">Material packages</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/78">
            Order takeoff packages for windows, doors, lumber, trusses, cabinetry, masonry stone,
            door hardware, and millwork.
          </p>
        </div>
      </section>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {["All", ...PACKAGE_CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="site-filter shrink-0"
            data-active={category === c}
          >
            {c}
          </button>
        ))}
      </div>

      {message && <p className="mt-3 text-sm text-emerald-800">{message}</p>}

      <ul className="mt-6 space-y-4">
        {filtered.map((pkg) => (
          <li key={pkg.id} className="site-panel site-card-hover border-l-4 border-l-[var(--orange)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="site-kicker">
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
                className="btn-copper !px-4 !py-2 !text-sm"
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
