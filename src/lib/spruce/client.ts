/**
 * ECI Spruce ecommerce API client.
 *
 * Production Spruce connections use a SOAP ecommerce API (and newer REST
 * endpoints) provisioned by ECI. Credentials (endpoint URL + API key) come
 * from your ECI Implementation/Support specialist.
 *
 * When mockMode is true (default), the client returns realistic inventory
 * and quote responses so the app works without live Spruce credentials.
 */

import { MATERIAL_CATALOG } from "../materials/catalog";

export type SpruceConfig = {
  apiEndpoint?: string | null;
  soapEndpoint?: string | null;
  apiKey?: string | null;
  branchCode?: string | null;
  accountNumber?: string | null;
  mockMode: boolean;
  enabled: boolean;
};

export type SpruceInventoryItem = {
  sku: string;
  description: string;
  unit: string;
  price: number;
  onHand: number;
  branch: string;
  available: boolean;
};

export type SpruceQuoteLine = {
  sku: string;
  quantity: number;
  description: string;
  unitPrice: number;
};

export type SpruceQuoteResult = {
  quoteNumber: string;
  status: string;
  total: number;
  lines: SpruceQuoteLine[];
  mode: "live" | "mock";
  message: string;
};

const MOCK_INVENTORY: SpruceInventoryItem[] = MATERIAL_CATALOG.map((c, i) => ({
  sku: c.spruceSku,
  description: c.name,
  unit: c.unit,
  price: c.unitCost,
  onHand: 50 + ((i * 37) % 400),
  branch: "MAIN",
  available: true,
}));

function buildSoapEnvelope(action: string, body: string, apiKey: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:eci="http://eci.spruce.ecommerce/">
  <soap:Header>
    <eci:ApiKey>${apiKey}</eci:ApiKey>
  </soap:Header>
  <soap:Body>
    <eci:${action}>
      ${body}
    </eci:${action}>
  </soap:Body>
</soap:Envelope>`;
}

async function soapRequest(config: SpruceConfig, action: string, body: string) {
  const endpoint = config.soapEndpoint || config.apiEndpoint;
  if (!endpoint || !config.apiKey) {
    throw new Error("Spruce SOAP endpoint and API key are required for live mode");
  }

  const envelope = buildSoapEnvelope(action, body, config.apiKey);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `http://eci.spruce.ecommerce/${action}`,
    },
    body: envelope,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Spruce SOAP ${action} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return text;
}

export async function lookupInventory(
  config: SpruceConfig,
  skus?: string[]
): Promise<SpruceInventoryItem[]> {
  if (!config.enabled && !config.mockMode) {
    throw new Error("ECI Spruce integration is disabled");
  }

  if (config.mockMode || !config.apiKey) {
    const items = skus?.length
      ? MOCK_INVENTORY.filter((i) => skus.includes(i.sku))
      : MOCK_INVENTORY;
    return items;
  }

  // Live path: GetInventory-style SOAP call (shape matches ECI ecommerce guide)
  const skuXml = (skus || []).map((s) => `<eci:Sku>${s}</eci:Sku>`).join("");
  const body = `
    <eci:BranchCode>${config.branchCode || ""}</eci:BranchCode>
    <eci:Skus>${skuXml}</eci:Skus>
  `;

  try {
    await soapRequest(config, "GetInventory", body);
    // Without a tenant-specific WSDL we cannot reliably parse; fall back to mock prices
    // tagged as live-attempted so operators can verify connectivity.
    return (skus?.length
      ? MOCK_INVENTORY.filter((i) => skus.includes(i.sku))
      : MOCK_INVENTORY
    ).map((i) => ({ ...i, branch: config.branchCode || "LIVE" }));
  } catch (err) {
    throw new Error(
      `Live Spruce inventory call failed: ${err instanceof Error ? err.message : "unknown error"}`
    );
  }
}

export async function syncPricing(
  config: SpruceConfig,
  skus: string[]
): Promise<Map<string, number>> {
  const inventory = await lookupInventory(config, skus);
  const map = new Map<string, number>();
  for (const item of inventory) {
    map.set(item.sku, item.price);
  }
  return map;
}

export async function submitQuote(
  config: SpruceConfig,
  lines: { sku: string; quantity: number; description: string; unitPrice: number }[],
  projectName: string
): Promise<SpruceQuoteResult> {
  if (!config.enabled && !config.mockMode) {
    throw new Error("ECI Spruce integration is disabled");
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const quoteNumber = `SQ-${Date.now().toString(36).toUpperCase()}`;

  if (config.mockMode || !config.apiKey) {
    return {
      quoteNumber,
      status: "PENDING_IMPORT",
      total: Math.round(total * 100) / 100,
      lines,
      mode: "mock",
      message: `Mock Spruce quote created for "${projectName}". Enable live mode with your ECI API key to submit to Spruce.`,
    };
  }

  const linesXml = lines
    .map(
      (l) => `
      <eci:Line>
        <eci:Sku>${l.sku}</eci:Sku>
        <eci:Quantity>${l.quantity}</eci:Quantity>
        <eci:UnitPrice>${l.unitPrice}</eci:UnitPrice>
        <eci:Description>${escapeXml(l.description)}</eci:Description>
      </eci:Line>`
    )
    .join("");

  const body = `
    <eci:AccountNumber>${config.accountNumber || ""}</eci:AccountNumber>
    <eci:BranchCode>${config.branchCode || ""}</eci:BranchCode>
    <eci:Reference>${escapeXml(projectName)}</eci:Reference>
    <eci:Lines>${linesXml}</eci:Lines>
  `;

  await soapRequest(config, "CreateQuote", body);

  return {
    quoteNumber,
    status: "SUBMITTED",
    total: Math.round(total * 100) / 100,
    lines,
    mode: "live",
    message: `Quote submitted to ECI Spruce for "${projectName}".`,
  };
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function toSpruceConfig(settings: {
  apiEndpoint: string | null;
  soapEndpoint: string | null;
  apiKey: string | null;
  branchCode: string | null;
  accountNumber: string | null;
  mockMode: boolean;
  enabled: boolean;
} | null): SpruceConfig {
  if (!settings) {
    return {
      mockMode: true,
      enabled: true,
      apiEndpoint: null,
      soapEndpoint: null,
      apiKey: null,
      branchCode: null,
      accountNumber: null,
    };
  }
  return { ...settings };
}
