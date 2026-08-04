"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { formatCurrencyExact } from "@/lib/format";

type Settings = {
  apiEndpoint: string | null;
  soapEndpoint: string | null;
  apiKey: string | null;
  hasApiKey: boolean;
  branchCode: string | null;
  accountNumber: string | null;
  enabled: boolean;
  mockMode: boolean;
};

type InventoryItem = {
  sku: string;
  description: string;
  unit: string;
  price: number;
  onHand: number;
  branch: string;
};

export default function SpruceSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mode, setMode] = useState("mock");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/spruce/settings");
      const data = await res.json();
      if (res.ok) setSettings(data.settings);

      const inv = await fetch("/api/spruce/inventory");
      const invData = await inv.json();
      if (inv.ok) {
        setInventory(invData.inventory || []);
        setMode(invData.mode);
      }
    })();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/spruce/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiEndpoint: form.get("apiEndpoint") || null,
        soapEndpoint: form.get("soapEndpoint") || null,
        apiKey: form.get("apiKey") || null,
        branchCode: form.get("branchCode") || null,
        accountNumber: form.get("accountNumber") || null,
        enabled: form.get("enabled") === "on",
        mockMode: form.get("mockMode") === "on",
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Save failed");
      return;
    }
    setSettings(data.settings);
    setMessage("Spruce settings saved.");

    const inv = await fetch("/api/spruce/inventory");
    const invData = await inv.json();
    if (inv.ok) {
      setInventory(invData.inventory || []);
      setMode(invData.mode);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <AppNav user={{ name: "You" }} />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link href="/dashboard" className="text-sm text-[var(--sage)] hover:text-[var(--ink)]">
          ← Projects
        </Link>
        <h1 className="mt-3 font-display text-4xl font-semibold">ECI Spruce</h1>
        <p className="mt-2 max-w-2xl text-[var(--sage)]">
          Connect Fieldline to your Spruce ecommerce API for inventory pricing and quote submission.
          Ask your ECI Implementation specialist for the endpoint URL and API key. Mock mode works
          without credentials using the built-in catalog.
        </p>

        {settings && (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 border-t border-[var(--line)] pt-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="apiEndpoint">
                  REST / API endpoint
                </label>
                <input
                  id="apiEndpoint"
                  name="apiEndpoint"
                  className="input-field"
                  defaultValue={settings.apiEndpoint || ""}
                  placeholder="https://your-spruce-host/api"
                />
              </div>
              <div>
                <label className="label" htmlFor="soapEndpoint">
                  SOAP endpoint
                </label>
                <input
                  id="soapEndpoint"
                  name="soapEndpoint"
                  className="input-field"
                  defaultValue={settings.soapEndpoint || ""}
                  placeholder="https://your-spruce-host/soap"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="apiKey">
                API key
              </label>
              <input
                id="apiKey"
                name="apiKey"
                className="input-field"
                defaultValue={settings.apiKey || ""}
                placeholder={settings.hasApiKey ? "Leave blank to keep existing key" : "Provided by ECI"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="branchCode">
                  Branch code
                </label>
                <input
                  id="branchCode"
                  name="branchCode"
                  className="input-field"
                  defaultValue={settings.branchCode || ""}
                />
              </div>
              <div>
                <label className="label" htmlFor="accountNumber">
                  Account number
                </label>
                <input
                  id="accountNumber"
                  name="accountNumber"
                  className="input-field"
                  defaultValue={settings.accountNumber || ""}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
                Integration enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="mockMode" defaultChecked={settings.mockMode} />
                Mock mode (no live Spruce calls)
              </label>
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-emerald-800">{message}</p>}

            <button type="submit" disabled={loading} className="btn-copper">
              {loading ? "Saving…" : "Save connection"}
            </button>
          </form>
        )}

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold">Inventory preview</h2>
              <p className="mt-1 text-sm text-[var(--sage)]">
                Currently serving <span className="font-semibold text-[var(--ink)]">{mode}</span> catalog
                data ({inventory.length} SKUs)
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--ink)] text-xs uppercase tracking-wider text-[var(--sage)]">
                  <th className="py-3 pr-3">SKU</th>
                  <th className="py-3 pr-3">Description</th>
                  <th className="py-3 pr-3">Price</th>
                  <th className="py-3 pr-3">On hand</th>
                  <th className="py-3">Branch</th>
                </tr>
              </thead>
              <tbody>
                {inventory.slice(0, 12).map((item) => (
                  <tr key={item.sku} className="border-b border-[var(--line)]">
                    <td className="py-2 pr-3 font-mono text-xs">{item.sku}</td>
                    <td className="py-2 pr-3">{item.description}</td>
                    <td className="py-2 pr-3">{formatCurrencyExact(item.price)}</td>
                    <td className="py-2 pr-3">
                      {item.onHand} {item.unit}
                    </td>
                    <td className="py-2">{item.branch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
