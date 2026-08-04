/**
 * Operating company / legal contact defaults for BuildIQ (product of Supply Monkey).
 * Override via environment variables when needed.
 */

export const LEGAL = {
  entityName:
    process.env.LEGAL_ENTITY_NAME || "Supply Monkey Lumber & Materials Co",
  productName: process.env.NEXT_PUBLIC_APP_NAME || "BuildIQ",
  addressLines: (
    process.env.LEGAL_ENTITY_ADDRESS ||
    "710 N Montezuma St\nPrescott, Arizona 86302\nUnited States"
  ).split("\n"),
  addressOneLine:
    process.env.LEGAL_ENTITY_ADDRESS_ONE_LINE ||
    "710 N Montezuma St, Prescott, Arizona 86302, United States",
  governingState: process.env.LEGAL_GOVERNING_STATE || "Arizona",
  governingCountry: process.env.LEGAL_GOVERNING_COUNTRY || "United States",
  supportEmail: process.env.SUPPORT_EMAIL || "support@supplymonkeyco.com",
  privacyEmail: process.env.PRIVACY_EMAIL || "support@supplymonkeyco.com",
  legalEmail: process.env.LEGAL_EMAIL || "support@supplymonkeyco.com",
  /** Policies are drafts until counsel signs off — do not treat as final published law. */
  policiesAreDrafts: process.env.LEGAL_POLICIES_FINAL !== "true",
} as const;

export function legalEmailFooter() {
  const { entityName, addressOneLine, supportEmail, productName } = LEGAL;
  return [
    "—",
    `${productName} by ${entityName}`,
    addressOneLine,
    `Support: ${supportEmail}`,
    "This message may concern account security or account management. If you did not request it, contact support.",
  ].join("\n");
}

export function draftPolicyBanner() {
  return "DRAFT FOR ATTORNEY REVIEW — Not final legal advice. Do not rely on this document as a published, counsel-approved policy until your attorney has reviewed and approved it.";
}
