"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/signup");
        else {
          setUser(d.user);
          if (d.company?.onboarded && d.company.projectCount > 0) {
            router.replace("/dashboard");
          }
        }
      });
  }, [router]);

  async function finish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    await fetch("/api/company/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: form.get("phone") || undefined,
        city: form.get("city") || undefined,
        state: form.get("state") || undefined,
        complete: true,
      }),
    });
    router.push("/projects/new");
  }

  return (
    <AppShell user={user || { name: "Builder" }}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--copper-deep)]">
        Welcome aboard
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold">
        Set up {user?.companyName || "your company"}
      </h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Three steps and your builders can estimate from the app.
      </p>

      <ol className="mt-8 space-y-4">
        {[
          ["1", "Company profile", "Confirm where you build."],
          ["2", "First job", "Create a residential project and upload plans."],
          ["3", "Invite team", "Send invite codes to estimators from Team."],
        ].map(([n, title, body]) => (
          <li key={n} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white/50 p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-sm font-semibold text-[var(--paper)]">
              {n}
            </span>
            <div>
              <p className="font-display text-lg font-semibold">{title}</p>
              <p className="text-sm text-[var(--sage)]">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <form onSubmit={finish} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" type="tel" className="input-field !py-3" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="city">
              City
            </label>
            <input id="city" name="city" className="input-field !py-3" />
          </div>
          <div>
            <label className="label" htmlFor="state">
              State
            </label>
            <input id="state" name="state" className="input-field !py-3" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-copper w-full !py-3.5">
          {loading ? "Saving…" : "Continue to first job"}
        </button>
        <Link href="/dashboard" className="block text-center text-sm text-[var(--sage)]">
          Skip for now
        </Link>
      </form>
    </AppShell>
  );
}
