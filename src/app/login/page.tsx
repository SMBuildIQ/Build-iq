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
      <main id="main-content" className="mx-auto grid max-w-5xl gap-0 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-16">
        <section className="relative hidden min-h-[420px] overflow-hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero.jpg"
            alt="Supply Monkey lumber yard"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark)] via-[var(--dark)]/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="font-hand text-2xl text-[var(--orange)]">No more monkey business</p>
            <h2 className="mt-2 font-display text-4xl">Premium materials. Aligned supply.</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
              BuildIQ for builders — estimating, takeoffs, and packages from Supply Monkey Lumber
              &amp; Materials Co.
            </p>
          </div>
        </section>

        <section className="site-panel flex flex-col justify-center p-8 sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-iq.png" alt="" className="h-14 w-auto self-start object-contain" />
          <p className="font-hand mt-6 text-xl text-[var(--orange-deep)]">Welcome back</p>
          <h1 className="mt-1 font-display text-4xl text-[var(--brown-ink)]">Sign in</h1>
          <p className="mt-2 text-sm text-[var(--sage)]">BuildIQ by Supply Monkey</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
                className="input-field !py-3.5"
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
                className="input-field !py-3.5"
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

          <p className="mt-5 text-sm text-[var(--sage)]">
            <Link href="/forgot-password" className="font-semibold text-[var(--orange-deep)]">
              Forgot password?
            </Link>
          </p>
          <p className="mt-3 text-sm text-[var(--sage)]">
            No account?{" "}
            <Link href="/register" className="font-semibold text-[var(--orange-deep)]">
              Create one
            </Link>
          </p>
        </section>
      </main>
    </MarketingShell>
  );
}
