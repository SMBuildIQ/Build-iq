"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AppNav } from "@/components/AppNav";

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
    <div className="min-h-screen hero-wash blueprint-grid">
      <AppNav />
      <main className="mx-auto flex max-w-md flex-col px-5 py-16">
        <h1 className="font-display text-4xl font-semibold text-[var(--ink)]">Start estimating</h1>
        <p className="mt-2 text-[var(--sage)]">Create your BuildIQ account in under a minute.</p>

        <form onSubmit={onSubmit} className="surface mt-8 space-y-4 p-6">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input id="name" name="name" required className="input-field" placeholder="Alex Builder" />
          </div>
          <div>
            <label className="label" htmlFor="companyName">
              Company
            </label>
            <input id="companyName" name="companyName" className="input-field" placeholder="Ridge Homes" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input-field" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input id="password" name="password" type="password" required minLength={8} className="input-field" placeholder="At least 8 characters" />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={loading} className="btn-copper w-full">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-[var(--sage)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--copper-deep)] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
