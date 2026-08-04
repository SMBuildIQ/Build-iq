"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import type { PlatformModule } from "@/lib/modules/registry";

export default function ModulesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string; role?: string } | null>(null);
  const [modules, setModules] = useState<PlatformModule[]>([]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else setUser(d.user);
      });
    fetch("/api/modules")
      .then((r) => r.json())
      .then((d) => setModules(d.modules || []));
  }, [router]);

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">Platform modules</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Implemented modules are available in the app. Planned modules show an honest empty state — no fake save actions.
      </p>
      <ul className="mt-6 space-y-3">
        {modules.map((m) => (
          <li key={m.slug}>
            <Link
              href={
                m.status === "FULL" || m.status === "PARTIAL"
                  ? m.slug === "projects" || m.slug === "dashboard"
                    ? "/dashboard"
                    : m.slug === "company-settings"
                      ? "/team"
                      : `/modules/${m.slug}`
                  : `/modules/${m.slug}`
              }
              className="block rounded-2xl border border-[var(--line)] bg-white/55 px-4 py-3 hover:border-[var(--copper)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-lg font-semibold">{m.name}</span>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-1 text-sm text-[var(--sage)]">{m.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "FULL"
      ? "bg-emerald-100 text-emerald-900"
      : status === "PARTIAL"
        ? "bg-amber-100 text-amber-950"
        : "bg-neutral-200 text-neutral-700";
  return (
    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles}`}>
      {status}
    </span>
  );
}
