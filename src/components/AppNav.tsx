"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function SoftLaunchWordmark() {
  return (
    <span className="inline-flex items-end whitespace-nowrap pt-[0.55em] font-display text-2xl font-semibold tracking-tight uppercase leading-none" aria-label="BuildIQ">
      <span className="text-[var(--ink)]">Build</span>
      <span className="relative text-[var(--orange,#FF8833)]">
        <svg
          className="pointer-events-none absolute left-[0.05em] top-[-0.72em] h-[0.35em] w-[0.48em]"
          viewBox="0 0 32 22"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M15.2 1.2c.4-.8 1.2-.8 1.6 0l.6 1.4c.2.4 0 .8-.4.9h-2c-.4 0-.6-.5-.4-.9l.6-1.4z" fill="#6B4A2A" />
          <path d="M15.5 3.2c-1.2.2-3.8 1.4-5.8 4.2-2.2 3.1-3.4 7.2-2.6 9.2.4 1 1.6.8 2.2-.2 1.4-2.2 2.8-5.4 4.2-7.6 1-1.6 2-2.8 2.8-3.4-.4-.8-.6-1.6-.8-2.2z" fill="#F5C542" />
          <path d="M15.2 4c-1 .2-3 1.4-4.6 3.6-1.6 2.2-2.6 4.8-2.8 6.2" stroke="#E8A317" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <path d="M16 3.1c.2 1.4.4 4.2.2 7.2-.2 2.8-.8 5.6-1.2 7.2-.2.8.4 1.4 1.1 1.1 1.2-.5 2.4-2.8 3-5.6.6-2.8.6-6.2.2-8.4-.6-.8-2-.8-3.3-1.5z" fill="#FFE066" />
          <path d="M16.5 3.2c1.2.2 3.8 1.4 5.8 4.2 2.2 3.1 3.4 7.2 2.6 9.2-.4 1-1.6.8-2.2-.2-1.4-2.2-2.8-5.4-4.2-7.6-1-1.6-2-2.8-2.8-3.4.4-.8.6-1.6.8-2.2z" fill="#F0B429" />
          <path d="M16.8 4c1 .2 3 1.4 4.6 3.6 1.6 2.2 2.6 4.8 2.8 6.2" stroke="#D4920F" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <ellipse cx="16" cy="6.5" rx="1.4" ry="2.2" fill="#FFF6C2" opacity="0.55" />
        </svg>
        IQ
      </span>
    </span>
  );
}

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
        <Link href={user ? "/dashboard" : "/"} className="font-display tracking-tight">
          <SoftLaunchWordmark />
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
    DRAFT: "border-[var(--line-strong)] text-[var(--ink-soft)]",
    ANALYZING: "border-[var(--orange)] text-[var(--orange-deep)]",
    ESTIMATED: "border-[var(--brown)] text-[var(--brown-ink)]",
    BIDDING: "border-[var(--brown-light)] text-[var(--brown)]",
    SYNCED: "border-[var(--orange)] text-[var(--brown-ink)]",
    ARCHIVED: "border-[var(--line)] text-[var(--sage)]",
    SENT: "border-[var(--brown)] text-[var(--brown)]",
    VIEWED: "border-[var(--orange)] text-[var(--orange-deep)]",
    ACCEPTED: "border-[var(--brown-ink)] bg-[var(--mist)] text-[var(--brown-ink)]",
    AWARDED: "border-[var(--brown-ink)] bg-[var(--mist)] text-[var(--brown-ink)]",
    DECLINED: "border-red-300 text-red-800",
    EXPIRED: "border-[var(--line)] text-[var(--sage)]",
    SUPERSEDED: "border-[var(--line)] text-[var(--sage)]",
  };

  const labels: Record<string, string> = {
    DRAFT: "Draft",
    ANALYZING: "Analyzing",
    ESTIMATED: "Estimated",
    BIDDING: "Bidding",
    SYNCED: "Spruce synced",
    ARCHIVED: "Archived",
    SENT: "Sent",
    VIEWED: "Viewed",
    ACCEPTED: "Accepted",
    AWARDED: "Awarded",
    DECLINED: "Declined",
    EXPIRED: "Expired",
    SUPERSEDED: "Superseded",
  };

  return (
    <span className={`status-pill ${colors[status] || colors.DRAFT}`}>
      {labels[status] || status}
    </span>
  );
}
