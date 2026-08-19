"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

// Server-rendered layout can't see the current pathname without this client
// wrapper (see src/lib/auth/mfaPolicy.ts for the policy itself) — /settings
// stays reachable so a member who's required to enroll can actually get to
// the enrollment form; every other page is blocked until they do.
export function MfaGate({ mfaRequired, children }: { mfaRequired: boolean; children: React.ReactNode }) {
  const pathname = usePathname();

  if (mfaRequired && !pathname.startsWith("/settings")) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="mb-2 text-lg font-semibold text-amber-900">Two-factor authentication required</h1>
        <p className="mb-4 text-sm text-amber-800">
          Your organization requires two-factor authentication before you can use BuildIQ. Set it up now to continue.
        </p>
        <Link href="/settings" className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Go to Settings
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
