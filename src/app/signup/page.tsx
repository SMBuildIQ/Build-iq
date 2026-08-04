"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { MarketingShell } from "@/components/AppShell";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteCode = params.get("invite") || "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    if (form.get("acceptTerms") !== "on") {
      setLoading(false);
      setError("Please accept the Terms and Privacy Policy to continue.");
      return;
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        companyName: form.get("companyName"),
        phone: form.get("phone") || undefined,
        city: form.get("city") || undefined,
        state: form.get("state") || undefined,
        email: form.get("email"),
        password: form.get("password"),
        inviteCode: form.get("inviteCode") || undefined,
        acceptTerms: true,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Signup failed");
      return;
    }
    if (data.joinedExisting) {
      router.push("/dashboard");
    } else {
      router.push("/onboarding");
    }
    router.refresh();
  }

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-md px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--copper-deep)]">
          {inviteCode ? "Join your builder team" : "For residential builders"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-[var(--ink)]">
          {inviteCode ? "Accept invite" : "Create your BuildIQ company"}
        </h1>
        <p className="mt-2 text-sm text-[var(--sage)]">
          {inviteCode
            ? "Create your login to join the company workspace."
            : "Sign up your building company. Invite estimators. Run takeoffs from the app."}
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4 rounded-2xl border border-[var(--line)] bg-white/60 p-5">
          {inviteCode ? (
            <input type="hidden" name="inviteCode" value={inviteCode} />
          ) : null}

          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input id="name" name="name" required className="input-field !rounded-xl !py-3" placeholder="Alex Builder" />
          </div>

          {!inviteCode && (
            <>
              <div>
                <label className="label" htmlFor="companyName">
                  Company name
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  required
                  className="input-field !rounded-xl !py-3"
                  placeholder="Ridge Homes"
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">
                  Company phone
                </label>
                <input id="phone" name="phone" type="tel" className="input-field !rounded-xl !py-3" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="city">
                    City
                  </label>
                  <input id="city" name="city" className="input-field !rounded-xl !py-3" />
                </div>
                <div>
                  <label className="label" htmlFor="state">
                    State
                  </label>
                  <input id="state" name="state" className="input-field !rounded-xl !py-3" />
                </div>
              </div>
            </>
          )}

          {inviteCode && (
            <div>
              <label className="label" htmlFor="companyName">
                Company (from invite)
              </label>
              <input
              id="companyName"
              name="companyName"
              className="input-field !rounded-xl !py-3"
              defaultValue="Joining via invite"
              readOnly
            />
              <p className="mt-1 text-xs text-[var(--sage)]">Invite code: {inviteCode}</p>
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">
              Work email
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

          <label className="flex items-start gap-2 text-xs leading-relaxed text-[var(--sage)]">
            <input type="checkbox" name="acceptTerms" className="mt-0.5 h-4 w-4" required />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-semibold text-[var(--copper-deep)] underline-offset-2 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-[var(--copper-deep)] underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="btn-copper w-full !rounded-xl !py-3.5">
            {loading ? "Creating…" : inviteCode ? "Join company" : "Create builder account"}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--sage)]">Loading…</div>}>
      <SignupForm />
    </Suspense>
  );
}
