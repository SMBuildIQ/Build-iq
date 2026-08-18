"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function submitJson(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const responseBody = await res.json().catch(() => ({}));
    return { ok: false, error: responseBody.error ?? `Request failed (${res.status})` };
  }
  return { ok: true };
}

function DeleteButton({ onDelete, label }: { onDelete: () => Promise<{ ok: true } | { ok: false; error: string }>; label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    const result = await onDelete();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={onClick} disabled={busy} className="text-xs text-red-600 hover:underline disabled:opacity-50">
        Delete
      </button>
      {error && <span className="max-w-[16rem] text-right text-[10px] text-red-600">{error}</span>}
    </span>
  );
}

export function DepartmentsSection({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitJson("/api/v1/departments", "POST", { name });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    router.refresh();
  }

  async function onSaveEdit(id: string) {
    const result = await submitJson(`/api/v1/departments/${id}`, "PATCH", { name: editName });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-2 flex flex-col gap-1">
        {departments.map((d) =>
          editingId === d.id ? (
            <li key={d.id} className="flex items-center gap-2">
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <button type="button" onClick={() => onSaveEdit(d.id)} className="text-xs text-gray-900 hover:underline">
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                Cancel
              </button>
            </li>
          ) : (
            <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{d.name}</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(d.id);
                    setEditName(d.name);
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Edit
                </button>
                <DeleteButton label={d.name} onDelete={() => submitJson(`/api/v1/departments/${d.id}`, "DELETE")} />
              </span>
            </li>
          )
        )}
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitJson("/api/v1/cost-centers", "POST", { code, name });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setName("");
    router.refresh();
  }

  async function onSaveEdit(id: string) {
    const result = await submitJson(`/api/v1/cost-centers/${id}`, "PATCH", { code: editCode, name: editName });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-2 flex flex-col gap-1 text-sm">
        {costCenters.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="flex items-center gap-2">
              <input value={editCode} onChange={(e) => setEditCode(e.target.value)} className="w-24 rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <button type="button" onClick={() => onSaveEdit(c.id)} className="text-xs text-gray-900 hover:underline">
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                Cancel
              </button>
            </li>
          ) : (
            <li key={c.id} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-mono text-xs text-gray-500">{c.code}</span> — {c.name}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(c.id);
                    setEditCode(c.code);
                    setEditName(c.name);
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Edit
                </button>
                <DeleteButton label={`${c.code} — ${c.name}`} onDelete={() => submitJson(`/api/v1/cost-centers/${c.id}`, "DELETE")} />
              </span>
            </li>
          )
        )}
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

interface LocationRow {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  isShipping: boolean;
  isBilling: boolean;
}

const emptyLocationForm = { name: "", addressLine1: "", city: "", state: "", postalCode: "", country: "US", isShipping: true, isBilling: false };

export function LocationsSection({ locations }: { locations: LocationRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyLocationForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyLocationForm);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitJson("/api/v1/locations", "POST", { ...form, state: form.state || undefined, postalCode: form.postalCode || undefined });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm(emptyLocationForm);
    router.refresh();
  }

  async function onSaveEdit(id: string) {
    const result = await submitJson(`/api/v1/locations/${id}`, "PATCH", {
      ...editForm,
      state: editForm.state || undefined,
      postalCode: editForm.postalCode || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  return (
    <div>
      <ul className="mb-2 flex flex-col gap-1 text-sm">
        {locations.map((l) =>
          editingId === l.id ? (
            <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-md border border-gray-100 p-2">
              <input placeholder="Location name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <input placeholder="Address" value={editForm.addressLine1} onChange={(e) => setEditForm((f) => ({ ...f, addressLine1: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <input placeholder="City" value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} className="w-24 rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <input placeholder="State" value={editForm.state} onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} className="w-14 rounded-md border border-gray-300 px-2 py-0.5 text-xs" />
              <button type="button" onClick={() => onSaveEdit(l.id)} className="text-xs text-gray-900 hover:underline">
                Save
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:underline">
                Cancel
              </button>
            </li>
          ) : (
            <li key={l.id} className="flex items-center justify-between gap-2">
              <span>
                {l.name} — {l.city}
                {l.state ? `, ${l.state}` : ""}
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(l.id);
                    setEditForm({
                      name: l.name,
                      addressLine1: l.addressLine1,
                      city: l.city,
                      state: l.state ?? "",
                      postalCode: l.postalCode ?? "",
                      country: l.country,
                      isShipping: l.isShipping,
                      isBilling: l.isBilling,
                    });
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Edit
                </button>
                <DeleteButton label={l.name} onDelete={() => submitJson(`/api/v1/locations/${l.id}`, "DELETE")} />
              </span>
            </li>
          )
        )}
      </ul>
      <form onSubmit={onSubmit} className="flex flex-wrap gap-2">
        <input placeholder="Location name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="Address" value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="City" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <input placeholder="State" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm" />
        <button type="submit" disabled={submitting} className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium disabled:opacity-50">
          Add
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
