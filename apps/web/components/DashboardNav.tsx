"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/proposals", label: "Proposals" },
  { href: "/shop", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/cabinetry", label: "Cabinetry" },
  { href: "/settings", label: "Settings" },
] as const;

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="bq-nav" aria-label="Primary">
      <div className="bq-nav-inner">
        <Link href="/jobs" className="bq-nav-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" className="bq-nav-logo" width={36} height={36} />
          <span className="bq-nav-brand-text">
            <span className="bq-nav-brand-mark">BuildIQ</span>
            <span className="bq-nav-brand-sub">Supply Monkey</span>
          </span>
        </Link>
        <div className="bq-nav-links">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="bq-nav-link"
                data-active={active ? "true" : "false"}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
