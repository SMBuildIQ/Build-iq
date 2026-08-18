"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "idle" | "enrolling" | "backup-codes";

export function MfaSection({ mfaEnabled }: { mfaEnabled: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState("");

  async function startEnroll() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/mfa/enroll", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not start enrollment");
      return;
    }
    const data = await res.json();
    setQrCodeDataUrl(data.qrCodeDataUrl);
    setSecret(data.secret);
    setStep("enrolling");
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/mfa/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Verification failed");
      return;
    }
    const data = await res.json();
    setBackupCodes(data.backupCodes);
    setStep("backup-codes");
  }

  async function submitDisable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/auth/mfa/disable", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not disable MFA");
      return;
    }
    setDisabling(false);
    setPassword("");
    router.refresh();
  }

  if (step === "backup-codes") {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <p className="font-medium text-amber-800">
          Save these backup codes now — each one works once, and this is the only time they&apos;ll be shown. Use one if you
          lose access to your authenticator app.
        </p>
        <ul className="grid grid-cols-2 gap-1 rounded-md bg-gray-50 p-3 font-mono text-xs">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button
          onClick={() => {
            setStep("idle");
            router.refresh();
          }}
          className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          I&apos;ve saved these codes
        </button>
      </div>
    );
  }

  if (step === "enrolling") {
    return (
      <form onSubmit={submitVerify} className="flex flex-col gap-3 text-sm">
        <p className="text-gray-600">Scan this QR code with your authenticator app, or enter the secret manually.</p>
        {qrCodeDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URI, not a remote/optimizable image
          <img src={qrCodeDataUrl} alt="MFA enrollment QR code" className="h-40 w-40" />
        )}
        <p className="rounded-md bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600">{secret}</p>
        <input
          required
          autoFocus
          placeholder="6-digit code from your app"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "Verifying…" : "Verify and enable"}
          </button>
          <button type="button" onClick={() => setStep("idle")} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (mfaEnabled) {
    return (
      <div className="text-sm">
        <p className="mb-2 text-gray-700">Two-factor authentication is enabled on your account.</p>
        {!disabling ? (
          <button onClick={() => setDisabling(true)} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium">
            Disable two-factor authentication
          </button>
        ) : (
          <form onSubmit={submitDisable} className="flex flex-col gap-2">
            <input
              type="password"
              required
              autoFocus
              placeholder="Confirm your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            {error && <p className="text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50">
                {busy ? "Disabling…" : "Confirm disable"}
              </button>
              <button type="button" onClick={() => setDisabling(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm">
      <p className="mb-2 text-gray-500">Two-factor authentication is not enabled.</p>
      {error && <p className="mb-2 text-red-600">{error}</p>}
      <button onClick={startEnroll} disabled={busy} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {busy ? "Starting…" : "Enable two-factor authentication"}
      </button>
    </div>
  );
}
