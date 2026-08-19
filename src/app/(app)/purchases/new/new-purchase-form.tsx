"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ExtractedPurchaseFields } from "@/lib/ai/purchaseRequestExtraction";

const FIELD_LABELS: Record<string, string> = {
  productDescription: "Product / service description",
  quantity: "Quantity",
  requiredDeliveryDate: "Required delivery date",
  deliveryLocation: "Delivery location",
};

interface Option {
  id: string;
  label: string;
}

export function NewPurchaseForm({
  departments = [],
  costCenters = [],
  locations = [],
}: {
  departments?: { id: string; name: string }[];
  costCenters?: { id: string; code: string; name: string }[];
  locations?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [deliveryLocationId, setDeliveryLocationId] = useState("");
  const [extraction, setExtraction] = useState<{
    fields: ExtractedPurchaseFields;
    missingCriticalFields: string[];
    confidence: number;
  } | null>(null);

  const departmentOptions: Option[] = departments.map((d) => ({ id: d.id, label: d.name }));
  const costCenterOptions: Option[] = costCenters.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }));
  const locationOptions: Option[] = locations.map((l) => ({ id: l.id, label: l.name }));

  async function onParse(e: React.FormEvent) {
    e.preventDefault();
    setParsing(true);
    setError(null);
    const res = await fetch("/api/v1/purchase-requests/ai-parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ description }),
    });
    setParsing(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not parse description");
      return;
    }
    const data = await res.json();
    setExtraction(data);
  }

  function updateField<K extends keyof ExtractedPurchaseFields>(key: K, value: ExtractedPurchaseFields[K]) {
    if (!extraction) return;
    setExtraction({ ...extraction, fields: { ...extraction.fields, [key]: value } });
  }

  async function onConfirm() {
    if (!extraction) return;
    setSubmitting(true);
    setError(null);
    const f = extraction.fields;
    const res = await fetch("/api/v1/purchase-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: f.productDescription.slice(0, 120) || "Untitled purchase request",
        budget: f.budget ?? undefined,
        requiredDeliveryDate: f.requiredDeliveryDate ? new Date(f.requiredDeliveryDate).toISOString() : undefined,
        paymentTermsRequirement: f.paymentTermsRequirement ?? undefined,
        warrantyRequirement: f.warrantyRequirement ?? undefined,
        certificationRequirement: f.certificationRequirement ?? undefined,
        preferredSupplierIds: [],
        restrictedSupplierIds: [],
        additionalInstructions: f.additionalInstructions ?? undefined,
        originalDescription: description,
        departmentId: departmentId || undefined,
        costCenterId: costCenterId || undefined,
        deliveryLocationId: deliveryLocationId || undefined,
        lineItems: [
          {
            description: f.productDescription || description.slice(0, 200),
            category: f.category ?? undefined,
            manufacturer: f.manufacturer ?? undefined,
            model: f.modelOrSku ?? undefined,
            quantity: f.quantity ?? 1,
            unitOfMeasure: "each",
            targetPrice: f.budget && f.quantity ? f.budget / f.quantity : undefined,
            acceptableSubstitutions: f.acceptableSubstitutions,
          },
        ],
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not create purchase request");
      return;
    }
    const data = await res.json();
    router.push(`/purchases/${data.purchaseRequest.id}`);
  }

  if (!extraction) {
    return (
      <form onSubmit={onParse} className="flex flex-col gap-3">
        <textarea
          required
          minLength={10}
          rows={5}
          placeholder="e.g. We need 75 Lenovo ThinkPads with 32GB RAM delivered to Detroit before September 20. Budget is $95,000. Equivalent Dell models are acceptable."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={parsing}
          className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {parsing ? "Structuring request…" : "Structure this request"}
        </button>
      </form>
    );
  }

  const f = extraction.fields;

  return (
    <div className="flex flex-col gap-4">
      {extraction.missingCriticalFields.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Missing information: {extraction.missingCriticalFields.map((k) => FIELD_LABELS[k] ?? k).join(", ")}. Please
          fill these in below before confirming.
        </div>
      )}
      <p className="text-xs text-gray-400">
        AI confidence: {(extraction.confidence * 100).toFixed(0)}% — review every field before confirming.
      </p>

      <Field label="Product / service description">
        <textarea
          rows={2}
          value={f.productDescription}
          onChange={(e) => updateField("productDescription", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantity">
          <input
            type="number"
            value={f.quantity ?? ""}
            onChange={(e) => updateField("quantity", e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Budget ($)">
          <input
            type="number"
            value={f.budget ?? ""}
            onChange={(e) => updateField("budget", e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Manufacturer">
          <input
            value={f.manufacturer ?? ""}
            onChange={(e) => updateField("manufacturer", e.target.value || null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Category">
          <input
            value={f.category ?? ""}
            onChange={(e) => updateField("category", e.target.value || null)}
            placeholder="e.g. Laptops, HVAC parts"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Required delivery date">
          <input
            type="date"
            value={f.requiredDeliveryDate ? f.requiredDeliveryDate.slice(0, 10) : ""}
            onChange={(e) => updateField("requiredDeliveryDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Delivery location">
          <input
            value={f.deliveryLocation ?? ""}
            onChange={(e) => updateField("deliveryLocation", e.target.value || null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Payment terms">
          <input
            value={f.paymentTermsRequirement ?? ""}
            onChange={(e) => updateField("paymentTermsRequirement", e.target.value || null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Department">
          <Select value={departmentId} onChange={setDepartmentId} options={departmentOptions} placeholder="None" />
        </Field>
        <Field label="Cost center">
          <Select value={costCenterId} onChange={setCostCenterId} options={costCenterOptions} placeholder="None" />
        </Field>
        <Field label="Ship-to location">
          <Select value={deliveryLocationId} onChange={setDeliveryLocationId} options={locationOptions} placeholder="None" />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => setExtraction(null)}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Confirm and create purchase request"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
