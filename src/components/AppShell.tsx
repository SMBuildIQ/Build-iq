"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderKanban, PlusCircle, Settings2, LogOut, Users } from "lucide-react";

const tabs = [
  { href: "/dashboard", label: "Jobs", icon: FolderKanban },
  { href: "/projects/new", label: "New", icon: PlusCircle },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings/spruce", label: "Spruce", icon: Settings2 },
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell min-h-dvh bg-[var(--paper)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md safe-top">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href={user ? "/dashboard" : "/"} className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-72.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="truncate">
              <span className="block font-display text-lg font-semibold leading-tight tracking-tight">
                BuildIQ
              </span>
              {user?.companyName && (
                <span className="block truncate text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--sage)]">
                  {user.companyName}
                </span>
              )}
            </span>
          </Link>
          {user ? (
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-[var(--sage)] hover:bg-black/5 hover:text-[var(--ink)]"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-[var(--copper-deep)]">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className={`mx-auto w-full max-w-3xl px-4 py-5 ${user ? "pb-28" : "pb-10"}`}>
        {children}
      </main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md safe-bottom">
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
                    className={`flex flex-col items-center gap-1 px-1 py-3 text-[11px] font-semibold tracking-wide ${
                      active ? "text-[var(--copper-deep)]" : "text-[var(--sage)]"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "stroke-[2.25]" : ""}`} />
                    {tab.label}
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

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh hero-wash">
      <header className="safe-top border-b border-[var(--line)] bg-[var(--paper)]/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-72.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-xl font-semibold">BuildIQ</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--ink-soft)]">
              Sign in
            </Link>
            <Link href="/signup" className="btn-copper !rounded-lg !px-3.5 !py-2 !text-sm">
              Builder signup
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
