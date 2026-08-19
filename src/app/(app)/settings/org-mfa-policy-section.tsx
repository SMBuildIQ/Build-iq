"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrgMfaPolicySection({ requireMfa }: { requireMfa: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/organization", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requireMfa: !requireMfa }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not update this setting");
      return;
    }
    router.refresh();
  }

  return (
    <div className="text-sm">
      <p className="mb-2 text-gray-600">
        {requireMfa
          ? "Every member must have two-factor authentication enrolled to use the app. They can't disable it themselves while this is on."
          : "Two-factor authentication is optional — each member decides for themselves under Settings."}
      </p>
      {error && <p className="mb-2 text-red-600">{error}</p>}
      <button
        onClick={toggle}
        disabled={busy}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {busy ? "Saving…" : requireMfa ? "Make two-factor authentication optional" : "Require two-factor authentication for all members"}
      </button>
    </div>
  );
}
