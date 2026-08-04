/** Public legal / support URLs for store review & in-app links. */
export const LEGAL = {
  developerName: "Supply Monkey Lumber & Materials Co",
  supportEmail: "support@supplymonkeyco.com",
  privacyContact: "support@supplymonkeyco.com",
  address: "710 N Montezuma St, Prescott, Arizona 86302, United States",
  /** Override with EXPO_PUBLIC_LEGAL_BASE_URL (HTTPS production host). */
  baseUrl:
    (typeof process !== "undefined" && process.env.EXPO_PUBLIC_LEGAL_BASE_URL?.replace(/\/$/, "")) ||
    "https://app.buildiq.com",
} as const;

export const LEGAL_URLS = {
  privacy: `${LEGAL.baseUrl}/privacy`,
  terms: `${LEGAL.baseUrl}/terms`,
  support: `${LEGAL.baseUrl}/support`,
  accountDeletion: `${LEGAL.baseUrl}/settings/account`,
} as const;

/**
 * Demo / offline mock auth is allowed only in __DEV__ or when explicitly
 * enabled for App Review / internal builds (EXPO_PUBLIC_ALLOW_DEMO=true).
 * Must be OFF for production App Store / Play binaries.
 */
export function allowDemoAuth(): boolean {
  if (typeof __DEV__ !== "undefined" && __DEV__) return true;
  return (
    typeof process !== "undefined" &&
    (process.env.EXPO_PUBLIC_ALLOW_DEMO === "true" || process.env.EXPO_PUBLIC_ALLOW_DEMO === "1")
  );
}
