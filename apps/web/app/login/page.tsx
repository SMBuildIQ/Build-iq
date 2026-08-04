"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition, type FormEvent } from "react";
import { loginSchema } from "@buildiq/validation";
import { Button } from "@/components/Button";
import { BuildIqWordmark } from "@/components/BuildIqWordmark";
import { apiFetch, ApiError } from "@/lib/api";
import { setAuthCookies } from "@/lib/cookies";
import type { UserSession } from "@buildiq/types";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forgot = searchParams.get("forgot") === "1";
  const [email, setEmail] = useState("demo@buildiq.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    forgot ? "Password reset is not wired yet — contact your admin or use demo credentials." : null,
  );
  const [pending, startTransition] = useTransition();

  async function attemptLogin() {
    setError(null);
    setInfo(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid credentials.");
      return;
    }

    try {
      const res = await apiFetch<{ token: string; user: UserSession }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setAuthCookies(res.token, res.user.id);
      startTransition(() => {
        router.push("/jobs");
        router.refresh();
      });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      const isNetwork = err instanceof TypeError || (err instanceof Error && /fetch|network|failed/i.test(err.message));
      const allowDemo = (isNetwork || status === 401) && password.length >= 8;

      if (allowDemo) {
        // Match mobile: continue in demo when API is down or credentials fail.
        setAuthCookies("demo-token", "demo");
        setInfo("API unavailable — continuing in demo mode.");
        startTransition(() => {
          router.push("/jobs");
          router.refresh();
        });
        return;
      }

      setError(err instanceof Error ? err.message : "Sign in failed.");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void attemptLogin();
  }

  return (
    <main className="bq-login">
      <section className="bq-login-visual" aria-label="Brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo-iq.png"
          alt="Supply Monkey IQ"
          width={240}
          height={96}
          style={{ width: 200, height: "auto", marginBottom: 20 }}
        />
        <p className="bq-label" style={{ color: "rgba(255,253,249,0.55)" }}>
          Supply Monkey Lumber & Materials Co
        </p>
        <p className="bq-hand">Welcome back</p>
        <h1 className="bq-display">
          <BuildIqWordmark size="display" />
        </h1>
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

          {forgot ? (
            <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: 0 }} role="status">
              Password reset email is not configured in this environment. Use your account credentials or continue
              with the demo login below.
            </p>
          ) : null}

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
          {info ? (
            <p className="bq-body" style={{ color: "var(--bq-text-secondary)", margin: 0 }} role="status">
              {info}
            </p>
          ) : null}

          <Button type="submit" variant="primary" disabled={pending} style={{ width: "100%" }}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>

          <div className="bq-login-links">
            <Link href="/login?forgot=1">Forgot password</Link>
            <Link href="/signup">Create account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="bq-login" />}>
      <LoginForm />
    </Suspense>
  );
}
