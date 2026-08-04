"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { MarketingShell } from "@/components/AppShell";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        companyName: form.get("companyName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <MarketingShell>
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">Get BuildIQ</h1>
        <p className="mt-2 text-sm text-[var(--sage)]">Create your account, then install the app to your home screen.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-[var(--line)] bg-white/60 p-5">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input id="name" name="name" required className="input-field !rounded-xl !py-3" placeholder="Alex Builder" />
          </div>
          <div>
            <label className="label" htmlFor="companyName">
              Company
            </label>
            <input id="companyName" name="companyName" className="input-field !rounded-xl !py-3" placeholder="Ridge Homes" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input-field !rounded-xl !py-3" />
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
              minLength={8}
              autoComplete="new-password"
              className="input-field !rounded-xl !py-3"
              placeholder="At least 8 characters"
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="btn-copper w-full !rounded-xl !py-3.5">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--sage)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--copper-deep)]">
            Sign in
          </Link>
        </p>
      </main>
    </MarketingShell>
  );
}
