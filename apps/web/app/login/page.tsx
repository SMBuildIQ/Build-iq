"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { loginSchema } from "@buildiq/validation";
import { Button } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("alex@ridgelinebuilders.com");
  const [password, setPassword] = useState("demopass");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials.");
      return;
    }
    startTransition(() => {
      document.cookie = `bq_session=demo; path=/; max-age=${60 * 60 * 24 * 14}; SameSite=Lax`;
      router.push("/jobs");
      router.refresh();
    });
  }

  return (
    <main className="bq-login">
      <section className="bq-login-visual" aria-label="Brand">
        <p className="bq-label" style={{ color: "rgba(255,253,249,0.55)" }}>
          Supply Monkey Lumber & Materials Co
        </p>
        <p className="bq-hand">Welcome back</p>
        <h1 className="bq-display">BuildIQ</h1>
        <p className="bq-body" style={{ marginTop: 16, maxWidth: "36ch", color: "rgba(255,253,249,0.72)" }}>
          Job estimates, proposals, and millwork packages — built for the yard, not another SaaS grid.
        </p>
      </section>

      <section className="bq-login-panel">
        <form className="bq-login-form" onSubmit={onSubmit} noValidate>
          <div>
            <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 22 }}>
              Sign in
            </p>
            <h2 className="bq-title" style={{ fontSize: 40, marginTop: 4 }}>
              Dashboard
            </h2>
          </div>

          <div className="bq-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="bq-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="bq-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="bq-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="bq-body" style={{ color: "var(--bq-status-danger)", margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <div className="bq-login-links">
            <Link href="/login">Forgot password</Link>
            <Link href="/login">Create account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
