"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AppNav({
  user,
}: {
  user?: { name: string; companyName?: string | null } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const links = user
    ? [
        { href: "/dashboard", label: "Projects" },
        { href: "/projects/new", label: "New estimate" },
        { href: "/settings/spruce", label: "ECI Spruce" },
      ]
    : [
        { href: "/#how", label: "How it works" },
        { href: "/login", label: "Sign in" },
      ];

  return (
    <header className="relative z-20 border-b border-[var(--line)] bg-[var(--paper)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href={user ? "/dashboard" : "/"} className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">
          BuildIQ
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "text-[var(--ink-soft)] hover:bg-black/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <button onClick={logout} className="ml-1 rounded-md px-3 py-2 text-sm font-medium text-[var(--sage)] hover:text-[var(--ink)]">
              Sign out
            </button>
          ) : (
            <Link href="/register" className="btn-copper ml-2 !py-2 !text-sm">
              Start free
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-[var(--paper-deep)] text-[var(--ink-soft)]",
    ANALYZING: "bg-amber-100 text-amber-900",
    ESTIMATED: "bg-emerald-100 text-emerald-900",
    BIDDING: "bg-sky-100 text-sky-900",
    SYNCED: "bg-[var(--mist)] text-[var(--ink)]",
    ARCHIVED: "bg-neutral-200 text-neutral-600",
    SENT: "bg-sky-100 text-sky-900",
    AWARDED: "bg-emerald-100 text-emerald-900",
    DECLINED: "bg-rose-100 text-rose-900",
  };

  const labels: Record<string, string> = {
    DRAFT: "Draft",
    ANALYZING: "Analyzing",
    ESTIMATED: "Estimated",
    BIDDING: "Bidding",
    SYNCED: "Spruce synced",
    ARCHIVED: "Archived",
    SENT: "Sent",
    AWARDED: "Awarded",
    DECLINED: "Declined",
  };

  return (
    <span className={`status-pill ${colors[status] || colors.DRAFT}`}>
      {labels[status] || status}
    </span>
  );
}
