"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/AppNav";

export default function NewProjectPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[var(--paper)]">
      <AppNav user={{ name: "You" }} />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="font-display text-4xl font-semibold">New residential project</h1>
        <p className="mt-2 text-[var(--sage)]">Set the job basics, then upload blueprints for AI takeoff.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="label" htmlFor="name">
              Project name
            </label>
            <input id="name" name="name" required className="input-field" placeholder="Oak Street Residence" />
          </div>

          <div>
            <label className="label" htmlFor="address">
              Street address
            </label>
            <input id="address" name="address" className="input-field" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="city">
                City
              </label>
              <input id="city" name="city" className="input-field" />
            </div>
            <div>
              <label className="label" htmlFor="state">
                State
              </label>
              <input id="state" name="state" className="input-field" />
            </div>
            <div>
              <label className="label" htmlFor="zip">
                ZIP
              </label>
              <input id="zip" name="zip" className="input-field" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="squareFeet">
                Living area (sq ft)
              </label>
              <input id="squareFeet" name="squareFeet" type="number" min={200} className="input-field" placeholder="2400" />
            </div>
            <div>
              <label className="label" htmlFor="stories">
                Stories
              </label>
              <select id="stories" name="stories" className="input-field" defaultValue="1">
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
            <textarea id="notes" name="notes" rows={3} className="input-field" placeholder="Crawlspace foundation, architectural shingles…" />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="btn-copper">
            {loading ? "Creating…" : "Create project"}
          </button>
        </form>
      </main>
    </div>
  );
}
