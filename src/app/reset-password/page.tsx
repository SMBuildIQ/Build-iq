"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { MarketingShell } from "@/components/AppShell";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token. Use the link from your email.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Reset failed");
      return;
    }
    router.push("/login");
  }

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Choose a new password</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-white/60 p-5">
          <div>
            <label className="label" htmlFor="password">
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field !rounded-xl !py-3"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input-field !rounded-xl !py-3"
            />
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full !rounded-xl !py-3.5">
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--sage)]">
          <Link href="/login" className="font-semibold text-[var(--copper-deep)]">
            Back to sign in
          </Link>
        </p>
      </main>
    </MarketingShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--sage)]">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
