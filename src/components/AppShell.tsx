"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderKanban, ShoppingBag, ShoppingCart, PackageSearch, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

const tabs = [
  { href: "/dashboard", label: "Jobs", icon: FolderKanban },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/orders", label: "Track", icon: PackageSearch },
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
    <div className="app-shell min-h-dvh bg-[var(--paper-deep)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--dark)] text-white safe-top">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href={user ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="" className="h-9 w-9 object-contain" />
            <span className="truncate">
              <span className="block font-display text-lg leading-none tracking-wide text-[var(--orange)]">
                BuildIQ
              </span>
              {user?.companyName ? (
                <span className="mt-0.5 block truncate text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
                  {user.companyName}
                </span>
              ) : (
                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-white/60">
                  Supply Monkey
                </span>
              )}
            </span>
          </Link>
          {user ? (
            <div className="flex items-center gap-0.5">
              <Link
                href="/modules"
                className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-[var(--orange)]"
              >
                Modules
              </Link>
              <Link
                href="/team"
                className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-[var(--orange)]"
              >
                Team
              </Link>
              <Link
                href="/settings/account"
                className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-[var(--orange)]"
              >
                Account
              </Link>
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-sm text-white/70 hover:text-[var(--orange)]"
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
        className={`mx-auto w-full max-w-3xl px-4 py-5 outline-none ${user ? "pb-28" : "pb-10"}`}
      >
        {children}
      </main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white safe-bottom">
          <ul className="mx-auto grid max-w-3xl grid-cols-4">
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
                    className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
                      active ? "text-[var(--orange)]" : "text-[var(--sage)]"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "stroke-[2.25]" : ""}`} />
                    {tab.label}
                    {tab.href === "/cart" && cartCount > 0 && (
                      <span
                        className="absolute right-[18%] top-1.5 flex h-4 min-w-4 items-center justify-center bg-[var(--orange)] px-1 text-[9px] text-white"
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
            ? "absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/25 backdrop-blur-md"
            : "border-b border-[var(--line)] bg-[var(--dark)]"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-vertical.png" alt="Supply Monkey" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className={`px-3 py-2 text-sm font-medium ${transparent ? "text-white/90" : "text-white/80"}`}
            >
              Sign in
            </Link>
            <Link href="/signup" className="btn-copper !px-3.5 !py-2 !text-sm">
              Signup
            </Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-[var(--line)] bg-[var(--dark)] px-4 py-8 text-center text-xs text-white/70">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-vertical.png" alt="" className="mx-auto mb-4 h-10 w-auto opacity-95" />
        <p className="mb-2 font-display text-sm tracking-wide text-[var(--orange)]">
          BuildIQ · Supply Monkey Lumber &amp; Materials Co
        </p>
        <p className="mb-3">710 N Montezuma St, Prescott, Arizona 86302</p>
        <Link href="/privacy" className="hover:text-[var(--orange)]">
          Privacy (Draft)
        </Link>
        {" · "}
        <Link href="/terms" className="hover:text-[var(--orange)]">
          Terms (Draft)
        </Link>
        {" · "}
        <Link href="/support" className="hover:text-[var(--orange)]">
          Support
        </Link>
        {" · "}
        <a href="https://supplymonkeyco.com" className="hover:text-[var(--orange)]" target="_blank" rel="noreferrer">
          supplymonkeyco.com
        </a>
        <p className="mx-auto mt-3 max-w-md text-[10px] leading-relaxed text-white/50">
          Legal pages are drafts requiring attorney review and are not final published policies.
        </p>
      </footer>
    </div>
  );
}
