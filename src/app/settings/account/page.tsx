"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null; email?: string } | null>(null);
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else setUser({ ...d.user, email: d.user.email });
      });
  }, [router]);

  async function exportData() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/export");
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Export failed");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildiq-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Data export downloaded.");
  }

  async function deleteAccount() {
    if (confirm !== "DELETE") {
      setError('Type DELETE to confirm account deletion.');
      return;
    }
    if (!window.confirm("Permanently delete your BuildIQ account and related workspace data?")) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not delete account");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">Account</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Privacy controls required for App Store and Play Store compliance.
      </p>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white/55 p-4">
        <h2 className="font-display text-lg font-semibold">Your profile</h2>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">{user?.name}</p>
        <p className="text-sm text-[var(--sage)]">{user?.email}</p>
        <p className="text-sm text-[var(--sage)]">{user?.companyName}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--line)] bg-white/55 p-4">
        <h2 className="font-display text-lg font-semibold">Email verification</h2>
        <p className="mt-1 text-sm text-[var(--sage)]">
          Resend a verification link to confirm your email address.
        </p>
        <button
          onClick={async () => {
            setBusy(true);
            setError("");
            const res = await fetch("/api/auth/verify-email", { method: "POST" });
            const data = await res.json();
            setBusy(false);
            if (!res.ok) setError(data.error || "Could not send verification");
            else setMessage(data.alreadyVerified ? "Email already verified." : "Verification email sent.");
          }}
          disabled={busy}
          className="btn-secondary mt-3 !rounded-xl !py-2.5 !text-sm"
        >
          Send verification email
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--line)] bg-white/55 p-4">
        <h2 className="font-display text-lg font-semibold">Download my data</h2>
        <p className="mt-1 text-sm text-[var(--sage)]">
          Export account, jobs, and order history as JSON (data portability).
        </p>
        <button onClick={exportData} disabled={busy} className="btn-secondary mt-3 !rounded-xl !py-2.5 !text-sm">
          {busy ? "Working…" : "Download my data"}
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-red-200 bg-red-50/60 p-4">
        <h2 className="font-display text-lg font-semibold text-red-900">Delete account</h2>
        <p className="mt-1 text-sm text-red-900/80">
          Permanently deletes your login and related blueprint files. If you are the only owner, your company
          workspace and jobs are removed. If other team members remain, transfer ownership first.
          This meets Apple’s in-app account deletion requirement. Operated by Supply Monkey Lumber &amp; Materials Co.
          For help, email support@supplymonkeyco.com with subject “Account deletion request”.
        </p>
        <label className="label mt-4 !text-red-900/70" htmlFor="confirm">
          Type DELETE to confirm
        </label>
        <input
          id="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input-field !rounded-xl !py-3"
          autoComplete="off"
        />
        <button
          onClick={deleteAccount}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          Delete my account
        </button>
      </section>

      {message && <p className="mt-4 text-sm text-emerald-800">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <p className="mt-8 text-sm text-[var(--sage)]">
        <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms</Link> ·{" "}
        <Link href="/support">Support</Link>
      </p>
    </AppShell>
  );
}
