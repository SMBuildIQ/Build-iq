"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) router.push("/login");
        else setUser(d.user);
      });
  }, [router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        address: form.get("address") || undefined,
        city: form.get("city") || undefined,
        state: form.get("state") || undefined,
        zip: form.get("zip") || undefined,
        squareFeet: form.get("squareFeet") ? Number(form.get("squareFeet")) : undefined,
        stories: form.get("stories") ? Number(form.get("stories")) : 1,
        notes: form.get("notes") || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Could not create project");
      return;
    }
    router.push(`/projects/${data.project.id}`);
  }

  return (
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">New project</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">Set the job basics, then upload blueprints for AI takeoff.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">
            Project name
          </label>
          <input id="name" name="name" required className="input-field !rounded-xl !py-3" placeholder="Oak Street Residence" />
        </div>

        <div>
          <label className="label" htmlFor="address">
            Street address
          </label>
          <input id="address" name="address" className="input-field !rounded-xl !py-3" />
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
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
          <div>
            <label className="label" htmlFor="zip">
              ZIP
            </label>
            <input id="zip" name="zip" className="input-field !rounded-xl !py-3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="squareFeet">
              Sq ft
            </label>
            <input id="squareFeet" name="squareFeet" type="number" min={200} inputMode="numeric" className="input-field !rounded-xl !py-3" placeholder="2400" />
          </div>
          <div>
            <label className="label" htmlFor="stories">
              Stories
            </label>
            <select id="stories" name="stories" className="input-field !rounded-xl !py-3" defaultValue="1">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={3} className="input-field !rounded-xl" placeholder="Crawlspace foundation, architectural shingles…" />
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <button type="submit" disabled={loading} className="btn-copper w-full !rounded-xl !py-3.5">
          {loading ? "Creating…" : "Create project"}
        </button>
      </form>
    </AppShell>
  );
}
