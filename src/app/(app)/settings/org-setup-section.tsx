"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DepartmentsSection({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/departments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not add department");
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-2">
        {departments.map((d) => (
          <li key={d.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
            {d.name}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input placeholder="New department" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <button type="submit" disabled={submitting} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50">
          Add
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function CostCentersSection({ costCenters }: { costCenters: { id: string; code: string; name: string }[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/cost-centers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not add cost center");
      return;
    }
    setCode("");
    setName("");
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-2 flex flex-col gap-1 text-sm">
        {costCenters.map((c) => (
          <li key={c.id}>
            <span className="font-mono text-xs text-gray-500">{c.code}</span> — {c.name}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input placeholder="Code" value={code} onChange={(e) => setCode(e.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <button type="submit" disabled={submitting} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50">
          Add
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function LocationsSection({ locations }: { locations: { id: string; name: string; city: string; state: string | null }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/locations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, addressLine1, city, state: state || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not add location");
      return;
    }
    setName("");
    setAddressLine1("");
    setCity("");
    setState("");
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-2 flex flex-col gap-1 text-sm">
        {locations.map((l) => (
          <li key={l.id}>
            {l.name} — {l.city}
            {l.state ? `, ${l.state}` : ""}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <input placeholder="Location name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="Address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="State" value={state} onChange={(e) => setState(e.target.value)} className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <button type="submit" disabled={submitting} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50">
          Add
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
