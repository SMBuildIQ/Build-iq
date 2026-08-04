"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppNav } from "@/components/AppNav";

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
    <div className="min-h-screen hero-wash blueprint-grid">
      <AppNav />
      <main className="mx-auto flex max-w-md flex-col px-5 py-16">
        <h1 className="font-display text-4xl font-semibold text-[var(--ink)]">Welcome back</h1>
        <p className="mt-2 text-[var(--sage)]">Sign in to your Fieldline workspace.</p>

        <form onSubmit={onSubmit} className="surface mt-8 space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input-field" placeholder="you@builder.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" required className="input-field" />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--sage)]">
          No account?{" "}
          <Link href="/register" className="font-semibold text-[var(--copper-deep)] underline-offset-2 hover:underline">
            Create one
          </Link>
        </p>
      </main>
    </div>
  );
}
