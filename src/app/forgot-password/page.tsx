"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { MarketingShell } from "@/components/AppShell";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Request failed");
      return;
    }
    setMessage(data.message || "Check your email for a reset link.");
  }

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Reset password</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">
          Enter your work email and we’ll send a reset link if an account exists.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4 surface p-5">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input-field !py-3" />
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
          {message && <p className="text-sm text-emerald-800" role="status">{message}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5">
            {loading ? "Sending…" : "Send reset link"}
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
