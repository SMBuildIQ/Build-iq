"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddSupplierForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        Add supplier
      </button>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/suppliers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        city: city || undefined,
        contact: contactEmail ? { name: "Primary contact", email: contactEmail } : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not add supplier");
      return;
    }
    setOpen(false);
    setName("");
    setCity("");
    setContactEmail("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2 rounded-xl border border-gray-200 bg-white p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">Name</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">City</span>
        <input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium text-gray-500">Contact email</span>
        <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {submitting ? "Adding…" : "Save"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
        Cancel
      </button>
    </form>
  );
}
