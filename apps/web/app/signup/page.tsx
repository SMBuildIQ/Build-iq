"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { registerSchema } from "@buildiq/validation";
import type { UserSession } from "@buildiq/types";
import { Button } from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { setAuthCookies } from "@/lib/cookies";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const parsed = registerSchema.safeParse({ name, email, password, companyName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid registration.");
      return;
    }

    try {
      const res = await apiFetch<{ token: string; user: UserSession }>("/auth/register", {
        method: "POST",
        body: parsed.data,
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
        setAuthCookies("demo-token", "demo");
        setInfo("API unavailable — continuing in demo mode.");
        startTransition(() => {
          router.push("/jobs");
          router.refresh();
        });
        return;
      }

      setError(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  return (
    <main className="bq-login">
      <section className="bq-login-visual" aria-label="Brand">
        <p className="bq-label" style={{ color: "rgba(255,253,249,0.55)" }}>
          Supply Monkey Lumber & Materials Co
        </p>
        <p className="bq-hand">Join the yard</p>
        <h1 className="bq-display">BuildIQ</h1>
        <p className="bq-body" style={{ marginTop: 16, maxWidth: "36ch", color: "rgba(255,253,249,0.72)" }}>
          Create a company workspace for jobs, proposals, and millwork packages.
        </p>
      </section>

      <section className="bq-login-panel">
        <form className="bq-login-form" onSubmit={onSubmit} noValidate>
          <div>
            <p className="bq-hand" style={{ color: "var(--bq-accent-primary)", fontSize: 22 }}>
              Create account
            </p>
            <h2 className="bq-title" style={{ fontSize: 40, marginTop: 4 }}>
              Sign up
            </h2>
          </div>

          <div className="bq-field">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              className="bq-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="bq-field">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              className="bq-input"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
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
              autoComplete="new-password"
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
            {pending ? "Creating…" : "Create account"}
          </Button>

          <div className="bq-login-links">
            <Link href="/login">Already have an account</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
