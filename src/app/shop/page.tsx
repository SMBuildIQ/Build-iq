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
        <div className="site-topband__inner px-6 py-8">
          <p className="site-topband__eyebrow">Aligned supply</p>
          <h1 className="mt-2 font-display text-5xl text-white sm:text-6xl">Material packages</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
            Windows, doors, lumber, trusses, cabinetry, masonry, hardware, and millwork — sized from
            takeoff and staged for delivery.
          </p>
        </div>
      </section>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
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

      {message && (
        <p className="mt-4 text-sm font-medium text-[var(--brown-ink)]" role="status">
          {message}
        </p>
      )}

      <ul className="mt-8 space-y-5">
        {filtered.map((pkg) => (
          <li key={pkg.id} className="site-panel site-card-hover overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="border-b border-[var(--line)] p-6 lg:border-b-0 lg:border-r">
                <p className="site-kicker">{pkg.category}</p>
                <h2 className="mt-2 font-display text-3xl text-[var(--brown-ink)]">{pkg.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--sage)]">{pkg.description}</p>
                <ul className="mt-5 space-y-2 text-sm text-[var(--ink-soft)]">
                  {pkg.contents.slice(0, 4).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 bg-[var(--orange)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-between bg-[var(--mist)]/35 p-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--sage)]">Package</p>
                  <p className="price-display mt-1 text-4xl">{formatCurrencyExact(pkg.unitPrice)}</p>
                  <p className="mt-2 text-xs text-[var(--sage)]">{pkg.leadDays}-day lead time</p>
                  <p className="mt-4 font-mono text-[10px] tracking-wide text-[var(--ink-soft)]">
                    {pkg.spruceSku}
                  </p>
                </div>
                <button
                  onClick={() => addToCart(pkg.id)}
                  disabled={busyId === pkg.id}
                  className="btn-copper mt-6 w-full !py-3 !text-sm"
                >
                  {busyId === pkg.id ? "Adding…" : "Add to cart"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
