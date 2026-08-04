"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { DemoNotice } from "@/components/DemoNotice";
import { FilterChip } from "@/components/FilterChip";
import { HeroBand } from "@/components/HeroBand";
import { formatCurrency } from "@/lib/format";
import { getClientToken } from "@/lib/cookies";
import { fetchShopPackages } from "@/lib/data";
import { shopCategories } from "@/lib/mock-data";
import type { ShopPackage } from "@buildiq/types";

export default function ShopPage() {
  const [category, setCategory] = useState<(typeof shopCategories)[number]>("All");
  const [cartCount, setCartCount] = useState(0);
  const [packages, setPackages] = useState<ShopPackage[]>([]);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchShopPackages(getClientToken() ?? undefined);
      if (!cancelled) {
        setPackages(result.data);
        setDemo(result.demo);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (category === "All") return packages;
    return packages.filter((p) => p.category === category);
  }, [category, packages]);

  return (
    <>
      <HeroBand
        tone="shop"
        eyebrow="Yard packages"
        title="Shop"
        support="Material packages sized for the job — add to cart with one click."
        actions={
          <Button variant="inverse" type="button">
            Cart ({cartCount})
          </Button>
        }
      />

      <div className="bq-content" style={{ paddingTop: 32 }}>
        <DemoNotice show={demo} />
        <div className="bq-chips" role="group" aria-label="Categories" style={{ marginBottom: 28 }}>
          {shopCategories.map((c) => (
            <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
        </div>

        <div className="bq-grid-3">
          {filtered.map((pkg) => (
            <article key={pkg.id} className="bq-package">
              <div className="bq-package-body">
                <p className="bq-label bq-package-kicker">{pkg.category}</p>
                <h2 className="bq-package-name">{pkg.name}</h2>
                <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: 0 }}>
                  {pkg.description}
                </p>
                <ul className="bq-package-bullets">
                  {pkg.contents.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="bq-mono" style={{ color: "var(--bq-text-muted)", margin: 0 }}>
                  {pkg.spruceSku} · {pkg.leadDays} day lead
                </p>
              </div>
              <div className="bq-package-price">
                <span className="bq-price">{formatCurrency(pkg.unitPrice)}</span>
                <Button
                  variant="primary"
                  compact
                  type="button"
                  onClick={() => setCartCount((n) => n + 1)}
                >
                  Add to cart
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
