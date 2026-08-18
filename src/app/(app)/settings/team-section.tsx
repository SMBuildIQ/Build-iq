"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RoleOption {
  key: string;
  name: string;
}

export function InviteForm({ roles }: { roles: RoleOption[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [roleKey, setRoleKey] = useState(roles[0]?.key ?? "");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInviteUrl(null);
    const res = await fetch("/api/v1/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, roleKey }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create invite");
      return;
    }
    const data = await res.json();
    setInviteUrl(data.inviteUrl);
    setEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">Email</span>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">Role</span>
        <select value={roleKey} onChange={(e) => setRoleKey(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? "Sending…" : "Invite"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      {inviteUrl && (
        <p className="w-full text-xs text-gray-500">
          No email provider is configured — share this link directly:{" "}
          <a href={inviteUrl} className="underline">
            {inviteUrl}
          </a>
        </p>
      )}
    </form>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await fetch(`/api/v1/invites/${inviteId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={onClick} disabled={loading} className="text-xs font-medium text-gray-400 underline disabled:opacity-50">
      {loading ? "…" : "Revoke"}
    </button>
  );
}
