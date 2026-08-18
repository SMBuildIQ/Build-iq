# Known limitations

Honest list of simplifications and gaps in the current build. Nothing below is presented as finished elsewhere in
the app or docs — this is the canonical list.

## Simplified, not fake

- **RFQ email delivery** — real send via Resend when `RESEND_API_KEY` is set; without it, the email body is logged
  to the server console instead of silently pretending to send. The supplier portal link always works regardless.
- **PO document** — rendered as a print-friendly HTML page (`window.print()` → "Save as PDF" in any browser)
  rather than a generated PDF binary. No `pdfkit`/binary generation pipeline is wired up yet.
- **Quote document extraction** — PDF/Excel/email quotes are entered by a buyer through a manual-entry form
  (`ManualQuoteForm`), not auto-extracted. `QuoteExtractionField` (field-level traceability + confidence) exists in
  the schema for when a real extraction pipeline is built, but nothing writes to it yet.
- **Object storage** — no `Document` upload endpoint is wired up yet; the model and `storageKey` field exist for
  when local-disk or S3-compatible storage is added.
- **Negotiation delivery** — "Send negotiation" records the message as sent and logs it; there is no actual email
  dispatch to the supplier for the negotiation ask (RFQ send has real dispatch via Resend; negotiation reuses the
  same message-thread model but not the same delivery path yet).

## Modeled, not yet exposed

Invoice matching (three-way match), in-app/email notifications, the audit-log and document-library viewer UIs,
purchasing-intelligence benchmarking and natural-language query, supplier performance scoring, and ERP/accounting
integrations. All have real Prisma models (`Invoice`, `Notification`, `PriceBenchmark`, etc. — see
`DATABASE_SCHEMA.md`) so adding the UI/API surface later does not require a schema rewrite.

## Not started

Native mobile client, SSO/SAML, MFA enforcement (the `User.mfaEnabled`/`mfaSecret` columns exist but nothing
reads them), staging/production infrastructure provisioning, PostgreSQL migration (SQLite only today), and
external supplier discovery (search APIs, marketplaces) beyond the internal approved-supplier database.
