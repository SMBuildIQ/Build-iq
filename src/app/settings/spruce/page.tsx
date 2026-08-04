"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
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
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; companyName?: string | null } | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [mode, setMode] = useState("mock");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (!meData.user) {
        router.push("/login");
        return;
      }
      setUser(meData.user);

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
  }, [router]);

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
    <AppShell user={user || { name: "You" }}>
      <h1 className="font-display text-3xl font-semibold">ECI Spruce</h1>
      <p className="mt-2 text-sm text-[var(--sage)]">
        Connect BuildIQ to your Spruce ecommerce API. Mock mode works without credentials.
      </p>

      {settings && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="apiEndpoint">
              REST / API endpoint
            </label>
            <input
              id="apiEndpoint"
              name="apiEndpoint"
              className="input-field !rounded-xl !py-3"
              defaultValue={settings.apiEndpoint || ""}
              placeholder="https://your-spruce-host/api"
              inputMode="url"
            />
          </div>
          <div>
            <label className="label" htmlFor="soapEndpoint">
              SOAP endpoint
            </label>
            <input
              id="soapEndpoint"
              name="soapEndpoint"
              className="input-field !rounded-xl !py-3"
              defaultValue={settings.soapEndpoint || ""}
              placeholder="https://your-spruce-host/soap"
              inputMode="url"
            />
          </div>

          <div>
            <label className="label" htmlFor="apiKey">
              API key
            </label>
            <input
              id="apiKey"
              name="apiKey"
              className="input-field !rounded-xl !py-3"
              defaultValue={settings.apiKey || ""}
              placeholder={settings.hasApiKey ? "Leave blank to keep existing key" : "Provided by ECI"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="branchCode">
                Branch
              </label>
              <input
                id="branchCode"
                name="branchCode"
                className="input-field !rounded-xl !py-3"
                defaultValue={settings.branchCode || ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="accountNumber">
                Account #
              </label>
              <input
                id="accountNumber"
                name="accountNumber"
                className="input-field !rounded-xl !py-3"
                defaultValue={settings.accountNumber || ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4" />
              Integration enabled
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="mockMode" defaultChecked={settings.mockMode} className="h-4 w-4" />
              Mock mode (no live Spruce calls)
            </label>
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-emerald-800">{message}</p>}

          <button type="submit" disabled={loading} className="btn-copper w-full !rounded-xl !py-3.5">
            {loading ? "Saving…" : "Save connection"}
          </button>
        </form>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold">Inventory</h2>
        <p className="mt-1 text-sm text-[var(--sage)]">
          <span className="font-semibold text-[var(--ink)]">{mode}</span> catalog · {inventory.length} SKUs
        </p>

        <ul className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white/40">
          {inventory.slice(0, 10).map((item) => (
            <li key={item.sku} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.description}</p>
                <p className="font-mono text-xs text-[var(--sage)]">{item.sku}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold">{formatCurrencyExact(item.price)}</p>
                <p className="text-xs text-[var(--sage)]">
                  {item.onHand} {item.unit}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-xs text-[var(--sage)]">
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            Back to projects
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
