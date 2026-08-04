"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

type Member = {
  id: string;
  role: string;
  name: string;
  email: string;
  joinedAt: string;
};

type Invite = {
  id: string;
  code: string;
  email: string | null;
  role: string;
  expiresAt: string;
};

export default function TeamPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null; role?: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastInvitePath, setLastInvitePath] = useState("");

  const load = useCallback(async () => {
    const me = await fetch("/api/auth/me");
    const meData = await me.json();
    if (!meData.user) {
      router.push("/login");
      return;
    }
    setUser(meData.user);

    const [teamRes, inviteRes] = await Promise.all([
      fetch("/api/company/team"),
      fetch("/api/company/invite"),
    ]);
    const teamData = await teamRes.json();
    const inviteData = await inviteRes.json();
    if (teamRes.ok) setMembers(teamData.members || []);
    if (inviteRes.ok) setInvites(inviteData.invites || []);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function createInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/company/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email") || undefined,
        role: form.get("role") || "ESTIMATOR",
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not create invite");
      return;
    }
    setLastInvitePath(data.signupPath);
    setMessage(`Invite code ${data.invite.code} ready to share.`);
    e.currentTarget.reset();
    await load();
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">Your builders</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Everyone who signs up with an invite joins {user?.companyName || "your company"} and shares the same jobs.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-xl font-semibold">Team</h2>
        <ul className="mt-3 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white/50">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-[var(--sage)]">{m.email}</p>
              </div>
              <span className="rounded bg-[var(--paper-deep)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {user?.role === "OWNER" && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Invite a builder</h2>
          <form onSubmit={createInvite} className="mt-3 space-y-3 rounded-2xl border border-[var(--line)] bg-white/50 p-4">
            <div>
              <label className="label" htmlFor="email">
                Email (optional)
              </label>
              <input id="email" name="email" type="email" className="input-field !py-3" placeholder="estimator@builder.com" />
            </div>
            <div>
              <label className="label" htmlFor="role">
                Role
              </label>
              <select id="role" name="role" className="input-field !py-3" defaultValue="ESTIMATOR">
                <option value="OWNER">Owner</option>
                <option value="ADMIN">Admin</option>
                <option value="PROJECT_MANAGER">Project manager</option>
                <option value="SUPERINTENDENT">Superintendent</option>
                <option value="ESTIMATOR">Estimator</option>
                <option value="PURCHASING">Purchasing</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="DESIGNER">Designer</option>
                <option value="SALES">Sales</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            {lastInvitePath && (
              <p className="break-all rounded-xl bg-[var(--paper-deep)] px-3 py-2 text-xs text-[var(--ink-soft)]">
                Share: {typeof window !== "undefined" ? window.location.origin : ""}
                {lastInvitePath}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-copper w-full !py-3">
              {busy ? "Creating…" : "Create invite link"}
            </button>
          </form>
        </section>
      )}

      {invites.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Open invites</h2>
          <ul className="mt-3 space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm">
                <p className="font-mono font-semibold tracking-wider">{inv.code}</p>
                <p className="text-xs text-[var(--sage)]">
                  {inv.role}
                  {inv.email ? ` · ${inv.email}` : ""} · expires{" "}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
