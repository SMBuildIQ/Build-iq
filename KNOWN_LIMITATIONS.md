# Known limitations

Honest list of simplifications and gaps in the current build. Nothing below is presented as finished elsewhere in
the app or docs — this is the canonical list.

## Simplified, not fake

- **RFQ email delivery** — real send via Resend when `RESEND_API_KEY` is set; without it, the email body is logged
  to the server console instead of silently pretending to send. The supplier portal link always works regardless.
- **PO document** — rendered as a print-friendly HTML page (`window.print()` → "Save as PDF" in any browser)
  rather than a generated PDF binary. No `pdfkit`/binary generation pipeline is wired up yet.
- **Quote document extraction** — real for CSV (deterministic parsing, no AI call) and PDF/image (a genuine
  Anthropic vision integration in `src/lib/ai/quoteDocumentExtraction.ts`), both wired through
  `POST /rfq-suppliers/:id/quotes/extract` → prefilled review form → `POST /rfq-suppliers/:id/quotes` (which
  writes `QuoteExtractionField` rows with confidence and source-document traceability once the buyer has
  reviewed and submitted). Two real gaps: **Excel (.xlsx) is not parsed** — only CSV, PDF, and images — and the
  **PDF/image vision path has not been exercised against the live Anthropic API in this session** (no
  `ANTHROPIC_API_KEY` available here); it's covered by unit tests using a fake vision-capable `AIProvider`, and
  under the default mock provider it honestly reports extraction as unavailable rather than fabricating values.
  Email-attachment ingestion isn't a distinct code path — an emailed PDF/CSV attachment is handled the same as
  any other upload once saved to disk.
- **Invoice entry** — recorded manually by a buyer (`InvoiceForm`), not extracted from an uploaded invoice
  document. The three-way matching logic itself (`src/lib/invoiceMatching.ts`) is real and tested — see
  MODULE_STATUS.md — only the ingestion path is manual.
- **Document storage** — local disk (`uploads/<organizationId>/...`), not durable across instances or redeploys.
  Swapping to an S3-compatible bucket only touches `src/lib/documents/storage.ts`; `storageKey` never encodes a
  local-filesystem assumption beyond that module.
- **Negotiation delivery** — "Send negotiation" records the message as sent and logs it; there is no actual email
  dispatch to the supplier for the negotiation ask (RFQ send has real dispatch via Resend; negotiation reuses the
  same message-thread model but not the same delivery path yet).
- **Notifications** — in-app only, delivered by client-side polling (`NotificationBell`, every 30s) rather than a
  push channel; no email/SMS delivery.
- **Price benchmarking (brief §25)** — real: `recomputePriceBenchmarks()` averages actual `PurchaseOrderLineItem`
  prices on issued POs, and a quote >15% above the org's own historical average is flagged on the compare page and
  in dashboard insights. Two real gaps: `PurchaseRequestLineItem.category` is rarely populated today (nothing in
  the UI requires it), so most benchmarking currently falls back to a manufacturer-only bucket rather than a true
  category bucket; and there's no UI to browse benchmark history directly — the only exposure is the derived
  above-threshold flag.

## Modeled, not yet exposed

Purchasing-intelligence natural-language query and ERP/accounting integrations. These have real Prisma models
(or, for NL query, would reuse the existing AI provider abstraction) so adding the UI/API surface later does not
require a schema rewrite.
(Supplier performance scoring and price benchmarking are no longer in this category — see MODULE_STATUS.md #8 and
the "Also built" section for §25.)

## Not started

Native mobile client, SSO/SAML, MFA enforcement (the `User.mfaEnabled`/`mfaSecret` columns exist but nothing
reads them), staging/production infrastructure provisioning, PostgreSQL migration (SQLite only today), external
supplier discovery (search APIs, marketplaces) beyond the internal approved-supplier database, and virus/malware
scanning on uploaded documents (`Document.virusScanStatus` is always written as `"skipped"`).
