import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth/context";
import { SignOutButton } from "./sign-out-button";
import { NotificationBell } from "./notification-bell";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/purchases", label: "Purchases" },
  { href: "/rfqs", label: "RFQs" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/orders", label: "Orders" },
  { href: "/approvals", label: "Approvals" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/documents", label: "Documents" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white px-3 py-4">
        <div className="mb-2 px-2 text-lg font-semibold">BuildIQ</div>
        <div className="mb-4 px-2">
          <NotificationBell />
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-gray-200 pt-3 px-2 text-xs text-gray-500">
          <div className="font-medium text-gray-700">{ctx.name}</div>
          <div className="truncate">{ctx.email}</div>
          <div className="mt-1">{ctx.roleKeys.join(", ")}</div>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 bg-gray-50 p-6">{children}</main>
    </div>
  );
}
