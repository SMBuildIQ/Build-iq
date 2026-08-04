"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import type { PlatformModule } from "@/lib/modules/registry";

export default function ModuleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string } | null>(null);
  const [mod, setMod] = useState<PlatformModule | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else setUser(d.user);
      });
    fetch(`/api/modules?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setMod(d.module);
      });
  }, [router, slug]);

  return (
    <AppShell user={user || { name: "You" }}>
      <Link href="/modules" className="text-sm font-semibold text-[var(--copper-deep)]">
        ← All modules
      </Link>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      {mod && (
        <>
          <h1 className="mt-4 font-display text-3xl font-semibold">{mod.name}</h1>
          <p className="mt-2 text-sm text-[var(--sage)]">{mod.description}</p>
          <div className="mt-8 rounded-2xl border border-dashed border-[var(--line)] bg-white/40 px-5 py-10 text-center">
            {mod.status === "PLANNED" ? (
              <>
                <p className="font-display text-xl font-semibold">Planned — not built yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--sage)]">
                  This module is architected in the platform roadmap. There is no fake data entry here.
                  When it ships, it will use the same company RBAC and API contract as the rest of BuildIQ.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-xl font-semibold">
                  {mod.status === "FULL" ? "Available in the app" : "Partially implemented"}
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--sage)]">
                  Use Jobs, Shop, Team, and related screens for live workflows. Remaining gaps are tracked in
                  MODULE_STATUS.md.
                </p>
                <Link href="/dashboard" className="btn-copper mt-6 inline-flex">
                  Open jobs
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
