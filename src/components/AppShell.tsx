"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderKanban, ShoppingBag, ShoppingCart, PackageSearch, LogOut, FileText } from "lucide-react";
import { useEffect, useState } from "react";

const tabs = [
  { href: "/dashboard", label: "Jobs", icon: FolderKanban },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Track", icon: PackageSearch },
];

const headerLinks = [
  { href: "/cabinetry", label: "Cabinetry" },
  { href: "/agents", label: "Agents" },
  { href: "/team", label: "Team" },
  { href: "/settings/account", label: "Account" },
];

export function AppShell({
  user,
  children,
}: {
  user?: { name: string; companyName?: string | null; role?: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch("/api/cart")
      .then((r) => r.json())
      .then((d) => setCartCount(d.totals?.itemCount || 0))
      .catch(() => {});
  }, [user, pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--dark)]/95 text-white backdrop-blur-md safe-top">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={user ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-iq.png"
              alt="Supply Monkey IQ"
              className="h-10 w-auto max-w-[150px] object-contain object-left"
            />
            {user?.companyName ? (
              <span className="hidden truncate border-l border-white/15 pl-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55 sm:block">
                {user.companyName}
              </span>
            ) : null}
          </Link>
          {user ? (
            <div className="flex items-center gap-1">
              {headerLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`hidden px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition md:inline-flex ${
                    pathname.startsWith(l.href)
                      ? "text-[var(--orange)]"
                      : "text-white/60 hover:text-[var(--orange)]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <button
                onClick={logout}
                className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-2 text-white/55 transition hover:text-[var(--orange)]"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="font-display text-sm tracking-wide text-[var(--orange)]">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className={`relative z-[1] mx-auto w-full max-w-5xl px-4 outline-none sm:px-6 ${
          user ? "pb-28 pt-8" : "pb-10 pt-6"
        }`}
      >
        {children}
      </main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md safe-bottom">
          <ul className="mx-auto grid max-w-5xl grid-cols-5">
            {tabs.map((tab) => {
              const active =
                pathname === tab.href ||
                (tab.href !== "/dashboard" && pathname.startsWith(tab.href));
              const Icon = tab.icon;
              return (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 px-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                      active
                        ? "text-[var(--orange-deep)]"
                        : "text-[var(--sage)] hover:text-[var(--brown)]"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-x-6 top-0 h-0.5 bg-[var(--orange)]" />
                    )}
                    <Icon className={`h-5 w-5 ${active ? "stroke-[2.25]" : ""}`} />
                    {tab.label}
                    {tab.href === "/cart" && cartCount > 0 && (
                      <span
                        className="absolute right-[22%] top-2 flex h-4 min-w-4 items-center justify-center bg-[var(--orange)] px-1 text-[9px] text-white"
                        aria-label={`${cartCount} items in cart`}
                      >
                        {cartCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function MarketingShell({
  children,
  transparent = false,
}: {
  children: React.ReactNode;
  transparent?: boolean;
}) {
  return (
    <div className={`min-h-dvh ${transparent ? "bg-[var(--paper-deep)]" : "hero-wash"}`}>
      <header
        className={`safe-top ${
          transparent
            ? "absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/20 backdrop-blur-md"
            : "border-b border-white/10 bg-[var(--dark)]"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-iq.png" alt="Supply Monkey IQ" className="h-11 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={`px-3 py-2 text-sm font-medium ${transparent ? "text-white/90" : "text-white/80"}`}
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-copper !px-4 !py-2.5 !text-sm">
              Signup
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-white/10 bg-[var(--dark)] px-4 py-12 text-center text-xs text-white/65">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-iq.png" alt="" className="mx-auto mb-5 h-14 w-auto opacity-95" />
        <p className="mb-2 font-display text-base tracking-wide text-[var(--orange)]">
          BuildIQ · Supply Monkey Lumber &amp; Materials Co
        </p>
        <p className="mb-4">710 N Montezuma St, Prescott, Arizona 86302</p>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/privacy" className="hover:text-[var(--orange)]">
            Privacy (Draft)
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-[var(--orange)]">
            Terms (Draft)
          </Link>
          <span>·</span>
          <Link href="/support" className="hover:text-[var(--orange)]">
            Support
          </Link>
          <span>·</span>
          <a href="https://supplymonkeyco.com" className="hover:text-[var(--orange)]" target="_blank" rel="noreferrer">
            supplymonkeyco.com
          </a>
        </div>
        <p className="mx-auto mt-4 max-w-md text-[10px] leading-relaxed text-white/40">
          Legal pages are drafts requiring attorney review and are not final published policies.
        </p>
      </footer>
    </div>
  );
}
