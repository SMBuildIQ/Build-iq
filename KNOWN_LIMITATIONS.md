# Known limitations

Honest list of simplifications and gaps in the current build. Nothing below is presented as finished elsewhere in
the app or docs — this is the canonical list.

## Simplified, not fake

- **RFQ email delivery** — real send via Resend when `RESEND_API_KEY` is set; without it, the email body is logged
  to the server console instead of silently pretending to send. The supplier portal link always works regardless.
- **MFA (TOTP)** — real: enrollment (QR + manual secret entry), verification, single-use backup codes, and
  disable (requires password re-entry) all work end to end, with the TOTP secret encrypted at rest
  (`src/lib/auth/crypto.ts`) and login's brute-force lockout extended to code-verification attempts. Two real
  gaps: it's opt-in per user, not something an org admin can require of its members (no "require MFA" org
  policy), and the short-lived post-password `mfaToken` (5 min TTL) is a signed JWT, not a single-use nonce — it
  can be replayed against `/auth/mfa/challenge` as many times as an attacker can guess a code within that window,
  same brute-force lockout notwithstanding. Both are real, scoped follow-ups, not something silently faked.
- **PO document** — rendered as a print-friendly HTML page (`window.print()` → "Save as PDF" in any browser)
  rather than a generated PDF binary. No `pdfkit`/binary generation pipeline is wired up yet.
- **Quote document extraction** — real for CSV and Excel .xlsx (both deterministic parsing via a shared
  row-grid extractor, no AI call — .xlsx parsing uses `exceljs`) and PDF/image (a genuine Anthropic vision
  integration in `src/lib/ai/quoteDocumentExtraction.ts`), all wired through
  `POST /rfq-suppliers/:id/quotes/extract` → prefilled review form → `POST /rfq-suppliers/:id/quotes` (which
  writes `QuoteExtractionField` rows with confidence and source-document traceability once the buyer has
  reviewed and submitted). Two real gaps: **legacy binary .xls (pre-2007 format) is not parsed** — it's a
  different, non-OOXML binary layout the .xlsx parser can't read, so it's honestly reported as unsupported
  rather than misparsed or routed to vision (which doesn't handle spreadsheets either) — and the **PDF/image
  vision path has not been exercised against the live Anthropic API in this session** (no `ANTHROPIC_API_KEY`
  available here); it's covered by unit tests using a fake vision-capable `AIProvider`, and under the default
  mock provider it honestly reports extraction as unavailable rather than fabricating values. Email-attachment
  ingestion isn't a distinct code path — an emailed PDF/CSV/xlsx attachment is handled the same as any other
  upload once saved to disk.
- **Invoice entry** — a buyer can now upload a supplier invoice (CSV, .xlsx, PDF/image) and have it extracted via
  `src/lib/ai/invoiceDocumentExtraction.ts` (CSV/.xlsx deterministic, no AI call; PDF/image via a vision-capable
  provider), prefilling `InvoiceForm` for review — same "extraction previews, the buyer's submit is what
  persists and is the human-verification step" pattern as quotes, recorded to `InvoiceExtractionField`. Manual
  entry (no document at all) still works exactly as before. Same two real gaps as quote extraction: legacy .xls
  is not parsed, and the PDF/image vision path is untested against the live Anthropic API in this session (no
  `ANTHROPIC_API_KEY` here). The three-way matching logic itself (`src/lib/invoiceMatching.ts`) is real and
  tested — see MODULE_STATUS.md.
- **Document storage** — dual-driver, verified not just documented: local disk (`uploads/<organizationId>/...`,
  the default) or an S3-compatible bucket, selected by `STORAGE_DRIVER` (`src/lib/documents/storage.ts` dispatches
  to `localStorage.ts`/`s3Storage.ts`; both implement the identical two-function interface and the same
  `storageKey` shape, so callers and the `Document` model never know which is active). The S3 driver
  (`@aws-sdk/client-s3`) was built and round-tripped against a real in-process S3-API server (`s3rver`, not a
  mock) in `tests/s3-storage.test.ts` — including finding and fixing a real bug along the way: the SDK's default
  streaming/trailer-based checksum on `PutObject` hangs against non-AWS S3-compatible servers, fixed with
  `requestChecksumCalculation: "WHEN_REQUIRED"`. The local driver was smoke-tested end-to-end through the real
  running app (register → create supplier → upload → download, byte-for-byte match) after the refactor. Still not
  durable across instances/redeploys when running on the local driver — that's what `STORAGE_DRIVER=s3` is for, and
  nothing is deployed to a real bucket (no AWS/MinIO credentials in this session).
- **Database engine** — SQLite in dev/CI by design (see `ARCHITECTURE.md`'s "Deployment target"). The Postgres
  migration is verified, not just planned: a real local PostgreSQL 16 instance ran the full schema, the entire
  unit/integration suite, a production build, and the e2e suite with concurrent workers (no SQLite-specific
  `workers: 1` pin needed) with zero code changes beyond the one-line `datasource.provider` swap. Still not the
  committed/deployed default — actually switching is a deliberate deployment decision, not an engineering one.
- **Negotiation delivery** — now real: "Send negotiation" dispatches the AI-drafted message to the supplier's
  primary contact via the same Resend integration RFQ send uses (`src/lib/email.ts`, extracted so both share one
  implementation). Same honesty tradeoff as RFQ send — without `RESEND_API_KEY` configured it logs instead of
  pretending to send, and a supplier with no contact on file gets an honest log line rather than a fabricated
  delivery; the audit log records a `delivered: true/false` flag reflecting which happened.
- **Negotiation response recording** — now real: `POST /api/v1/negotiations/:id/respond` lets a buyer record what
  a supplier actually said back (accepted/countered/declined), only valid on a `sent` negotiation, and requires a
  `resultPrice` for accepted/countered so a decision can't be recorded without content. The compare page now
  fetches and renders the latest negotiation round instead of relying on ephemeral client-side state that reset
  on every page reload — a real gap this feature closed as a side effect. "Countered" offers a "Draft another
  round" action (drafts a fresh round via the same AI drafting path). Not built: nothing lets a buyer accept a
  counter without drafting a brand-new round first — countering twice in a row without redrafting isn't possible.
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

Native mobile client, SSO/SAML, staging/production infrastructure provisioning, external
supplier discovery (search APIs, marketplaces) beyond the internal approved-supplier database, and virus/malware
scanning on uploaded documents (`Document.virusScanStatus` is always written as `"skipped"`).
