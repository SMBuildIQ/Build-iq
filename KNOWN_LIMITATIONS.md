# Known limitations

Honest list of simplifications and gaps in the current build. Nothing below is presented as finished elsewhere in
the app or docs — this is the canonical list.

## Simplified, not fake

- **RFQ email delivery** — real send via Resend when `RESEND_API_KEY` is set; without it, the email body is logged
  to the server console instead of silently pretending to send. The supplier portal link always works regardless.
- **MFA (TOTP)** — real: enrollment (QR + manual secret entry), verification, single-use backup codes, and
  disable (requires password re-entry) all work end to end, with the TOTP secret encrypted at rest
  (`src/lib/auth/crypto.ts`) and login's brute-force lockout extended to code-verification attempts. Org admins
  can now require MFA for every member (`PATCH /api/v1/organization`, gated on `org:manage_settings`) — closing
  a gap this list previously tracked. Enforcement is a login-time-adjacent app-shell gate, not a login block: a
  required-but-unenrolled member can still authenticate (they need a session to reach the enrollment API in the
  first place) but every page except `/settings` renders a blocking "enroll now" screen until they do
  (`src/app/(app)/mfa-gate.tsx`, `src/lib/auth/mfaPolicy.ts`), and `/auth/mfa/disable` rejects the request outright
  while the policy is active. Live-smoke-verified end to end: toggle the policy on, confirm `/dashboard` blocks
  and `/settings` doesn't, enroll for real, confirm the block lifts, confirm disable is rejected, toggle the
  policy off, confirm disable then succeeds. The other MFA gap this list tracked is also closed: the
  short-lived post-password `mfaToken` (5 min TTL) is now a genuine single-use nonce, not just a signed JWT
  that happened to expire eventually — `MfaChallengeUse` (a jti burn list, `src/lib/auth/mfaChallengeStore.ts`)
  is written on the very first attempt against a token, win or lose, via a real unique-constraint violation at
  the database level rather than an application-level check-then-act race (verified under 10 concurrent
  consumption attempts against the same jti: exactly 1 wins). Live-smoke-verified end to end against the real
  running app: a wrong code on a fresh token burns it, replaying the same token with the *correct* code is then
  rejected as expired rather than succeeding, and a fresh login with a correct first-attempt code still works
  normally. Same "this verification step has expired" message either way — a replayed token gives an attacker no
  signal distinguishing it from a token that simply timed out.
- **PO document** — real, not just print-to-PDF: `GET /api/v1/purchase-orders/:id/pdf` (`src/lib/documents/purchaseOrderPdf.ts`,
  `pdfkit`) generates an actual PDF binary — header, buyer/supplier addresses, dates, terms, the full line-item
  table, freight/tax/total — verified by reading the bytes back with a real PDF parser (`pdf-parse`) in
  `tests/purchase-order-pdf.test.ts`, not just checking they start with `%PDF-`. The print-friendly HTML page
  (`window.print()`) still exists alongside it as a second option. Found and fixed one real, non-obvious bug in
  the process: `pdfkit` reads its `.afm` font metrics from disk at runtime relative to its own module location,
  and Next's bundler rewrites that to a build-time placeholder path that doesn't exist under `output: standalone`
  — invisible under `next dev`, only caught by the live smoke test against the actual standalone server. Fixed by
  adding `pdfkit` to `serverExternalPackages` in `next.config.ts`, the same mechanism already used for the Prisma
  packages.
- **Quote document extraction** — real for CSV, Excel .xlsx, and legacy binary .xls (all three deterministic
  parsing, no AI call — .xlsx via `exceljs`, legacy .xls via `@e965/xlsx`, a security-patched continuation of
  SheetJS published to npm; the bare `xlsx` package is deliberately not used since it's stuck at 0.18.5 on npm
  with unpatched prototype-pollution/ReDoS advisories) and PDF/image (a genuine Anthropic vision integration in
  `src/lib/ai/quoteDocumentExtraction.ts`), all wired through `POST /rfq-suppliers/:id/quotes/extract` →
  prefilled review form → `POST /rfq-suppliers/:id/quotes` (which writes `QuoteExtractionField` rows with
  confidence and source-document traceability once the buyer has reviewed and submitted). The legacy .xls gap
  this list previously tracked is closed — verified against a real BIFF8 (OLE2 compound file) workbook in
  `tests/quote-document-extraction.test.ts`, and live-smoke-tested through the actual running app (upload → real
  extraction endpoint → correct line items, freight, lead time, payment terms). One real gap remains: the
  **PDF/image vision path has not been exercised against the live Anthropic API in this session** (no
  `ANTHROPIC_API_KEY` available here); it's covered by unit tests using a fake vision-capable `AIProvider`, and
  under the default mock provider it honestly reports extraction as unavailable rather than fabricating values.
  Email-attachment ingestion isn't a distinct code path — an emailed PDF/CSV/xlsx/xls attachment is handled the
  same as any other upload once saved to disk.
- **Invoice entry** — a buyer can now upload a supplier invoice (CSV, .xlsx, .xls, PDF/image) and have it
  extracted via `src/lib/ai/invoiceDocumentExtraction.ts` (CSV/.xlsx/.xls deterministic, no AI call; PDF/image via
  a vision-capable provider), prefilling `InvoiceForm` for review — same "extraction previews, the buyer's submit
  is what persists and is the human-verification step" pattern as quotes, recorded to `InvoiceExtractionField`.
  Manual entry (no document at all) still works exactly as before. Same status as quote extraction: legacy .xls
  is now parsed (see above), and the PDF/image vision path is untested against the live Anthropic API in this
  session (no
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
- **Notifications** — in-app delivery is by client-side polling (`NotificationBell`, every 30s) rather than a push
  channel. Email is now real, not missing: `notifyUser`/`notifyRole` (`src/lib/notifications.ts`) email every
  notification via the same Resend integration RFQ send and negotiation send use — same honesty tradeoff, logging
  instead of sending without `RESEND_API_KEY` configured. The in-app `Notification` row is always written first
  and is the source of truth regardless of email outcome; a failed or unconfigured email never blocks it. Verified
  live: submitting a quote through the real supplier portal against a running server triggered the requester's
  actual email log line with the correct recipient, subject, and body. SMS delivery is still not implemented (no
  SMS provider integrated).
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

- **Virus/malware scanning** — real, not fake, but not active by default: `VIRUS_SCAN_DRIVER=clamav`
  (`src/lib/documents/virusScan.ts`) shells out to a local `clamscan` binary and streams the uploaded bytes to it
  over stdin before the file ever reaches storage — an infected file is rejected (HTTP 400, an audit log entry
  recorded, no `Document` row created, nothing written to disk/S3) rather than silently accepted.
  `tests/virus-scan.test.ts` verifies this against a real `clamscan` process using the industry-standard EICAR
  test string (a harmless, purpose-built 68-byte signature every AV vendor recognizes for exactly this kind of
  integration test — not live malware), and a live smoke test through the running app confirmed the same result:
  an EICAR upload blocked, a clean file accepted with `virusScanStatus: "clean"`. `clamscan` is a system binary,
  not an npm dependency, so the test skips cleanly (not fails) on any machine that doesn't have it installed.
  Two real gaps: `VIRUS_SCAN_DRIVER` is unset by default, so `Document.virusScanStatus` is still `"skipped"` out
  of the box — same honest default as before; and even when enabled, `clamscan` needs `freshclam` to have
  populated `/var/lib/clamav` with real virus signatures first, which requires outbound network access this
  sandbox doesn't have (`database.clamav.net` is unreachable through the proxy) — verified here only against a
  custom-built test-only signature database, not the official ClamAV virus database. The `Dockerfile` now
  installs `clamav-daemon` in the runner image (untested — this sandbox has no Docker daemon to build it with)
  but does not run `freshclam` automatically; that's a deployment decision (cron/sidecar), not an engineering one.

## Not started

Native mobile client, SSO/SAML, staging/production infrastructure provisioning, and external supplier discovery
(search APIs, marketplaces) beyond the internal approved-supplier database.
