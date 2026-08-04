"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { MarketingShell } from "@/components/AppShell";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Verifying…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error || "Verification failed");
          return;
        }
        setStatus("ok");
        setMessage("Email verified. You can continue in the app.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error during verification.");
      });
  }, [token]);

  return (
    <MarketingShell>
      <main id="main-content" className="mx-auto max-w-md px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">Email verification</h1>
        <p
          className={`mt-4 text-sm ${status === "error" ? "text-red-700" : "text-[var(--ink-soft)]"}`}
          role="status"
        >
          {message}
        </p>
        <p className="mt-8 text-sm">
          <Link href="/dashboard" className="font-semibold text-[var(--copper-deep)]">
            Go to dashboard
          </Link>
          {" · "}
          <Link href="/login" className="font-semibold text-[var(--copper-deep)]">
            Sign in
          </Link>
        </p>
      </main>
    </MarketingShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[var(--sage)]">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
