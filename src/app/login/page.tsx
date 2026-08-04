"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { MarketingShell } from "@/components/AppShell";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-md px-4 py-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-iq.png" alt="" className="mx-auto h-16 w-auto object-contain" />
        <h1 className="mt-6 text-center font-display text-4xl text-[var(--orange)]">Welcome back</h1>
        <p className="mt-2 text-center text-sm text-[var(--sage)]">
          Sign in to BuildIQ by Supply Monkey
        </p>

        <form onSubmit={onSubmit} className="surface mt-8 space-y-4 p-5">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-field !py-3"
              placeholder="you@builder.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input-field !py-3"
            />
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-copper w-full !py-3.5">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[var(--sage)]">
          <Link href="/forgot-password" className="font-semibold text-[var(--orange)]">
            Forgot password?
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-[var(--sage)]">
          No account?{" "}
          <Link href="/register" className="font-semibold text-[var(--orange)]">
            Create one
          </Link>
        </p>
      </main>
    </MarketingShell>
  );
}
