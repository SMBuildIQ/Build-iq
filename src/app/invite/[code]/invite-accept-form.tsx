"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InviteAcceptForm({ code, email, isExistingUser }: { code: string; email: string; isExistingUser: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/invites/accept/${code}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isExistingUser ? { password } : { name, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not accept invite");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input disabled value={email} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
      {!isExistingUser && (
        <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      )}
      <input
        type="password"
        required
        minLength={isExistingUser ? 1 : 10}
        placeholder={isExistingUser ? "Your existing password" : "Choose a password (10+ characters)"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
        {loading ? "Joining…" : isExistingUser ? "Sign in and join" : "Create account and join"}
      </button>
    </form>
  );
}
