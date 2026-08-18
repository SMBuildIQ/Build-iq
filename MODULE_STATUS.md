# Module status

Legend: **FULL** = real, tested, usable end to end · **PARTIAL** = real code, meaningful gaps · **PLANNED** =
schema modeled, no UI/API yet · **NONE** = not started.

Numbering follows the brief's MVP list (§37) where it maps directly.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Multi-tenant org architecture | FULL | Org/Location/Membership/Role/Permission, tested cross-tenant isolation |
| 2 | Authentication | FULL | Session cookie JWT, bcrypt, login lockout, and real TOTP-based MFA (enroll via QR/manual secret, verify, backup codes, disable requires password) — `src/lib/auth/mfa.ts` and `src/app/api/v1/auth/mfa/*`, gated correctly in `src/proxy.ts` |
| 3 | RBAC/permissions | FULL | Permission-key checks, org-scoped roles, seeded default role set |
| 4 | Org/branch/user administration | FULL | Team invite/accept flow, and full create/edit/delete for locations/departments/cost centers, all real and wired into purchase request creation. Delete is blocked (not cascaded) when a record is still referenced — by a purchase request's department/cost center/delivery location, or a member's default location — returning a clear error naming what's using it, rather than orphaning real cost-attribution history or failing with an opaque DB error |
| 5 | AI purchasing assistant | FULL | NL description → structured request, missing-field detection, full AIActivityLog trail |
| 6 | Purchase request creation | FULL | Structured line items, status history, tenant-scoped API + UI |
| 7 | Structured line items | FULL | Category/manufacturer/model/SKU/target price/substitutions |
| 8 | Vendor database | PARTIAL | Create/list suppliers + contacts; response rate, avg response time, on-time delivery rate, and a composite performance score are computed from real transaction history (`src/lib/supplierPerformance.ts`) and feed the AI recommendation — no historical-pricing view yet |
| 9 | RFQ creation | FULL | Generated from a purchase request's line items, editable instructions |
| 10 | RFQ email distribution | PARTIAL | Real send via Resend when configured; logs instead of sending otherwise. Portal link always works |
| 11 | Supplier response portal | FULL | Token-authenticated, no account required, structured pricing/freight/terms entry |
| 12 | Quote PDF/Excel/CSV upload | PARTIAL | Upload + extraction wired for CSV and Excel .xlsx (both real, deterministic parsers) and PDF/image (real Anthropic vision path); legacy binary .xls is honestly reported as unsupported rather than misparsed — see KNOWN_LIMITATIONS.md |
| 13 | AI quote extraction | PARTIAL | `src/lib/ai/quoteDocumentExtraction.ts`: CSV and .xlsx both parse without any AI call (via `exceljs` for .xlsx); PDF/image extraction is a real Claude vision integration, honestly reports "unavailable" under the mock provider (untested live in this session — no ANTHROPIC_API_KEY here, see KNOWN_LIMITATIONS.md) rather than fabricating data. `QuoteExtractionField` is populated with confidence + source-document traceability, written only once a human reviews/submits the prefilled form (brief §13's verification requirement) |
| 14 | Quote normalization | FULL | Total landed cost computed from product total + freight (portal and manual entry both) |
| 15 | Side-by-side comparison | FULL | `/purchases/[id]/compare` |
| 16 | AI purchasing recommendation | FULL | Explainable rationale, mock heuristic + Anthropic-backed, logged to AIActivityLog |
| 17 | Human-assisted negotiation | FULL | AI drafts, human sends — no autonomous path exists in code. Sending now dispatches real email via Resend (same integration as RFQ send), with an honest log fallback when no API key or supplier contact is configured |
| 18 | Approval engine | FULL | Deterministic PolicyRule evaluation, sequenced ApprovalSteps, role-gated decisions |
| 19 | Purchase order generation | FULL | Generated from an approved request + selected quote |
| 20 | Order tracking | FULL | Full status lifecycle with timeline |
| 21 | Basic receiving | FULL | Quantity received/damaged/missing per line item |
| 22 | Savings tracking | FULL | `SavingsRecord` populated at quote selection and again at invoicing; negotiated/benchmark/realized kept distinct |
| 23 | Dashboard/analytics | PARTIAL | Real counts, verified-savings sum, and a "purchasing insights" panel that surfaces unresponsive suppliers, invoice discrepancies, stale approvals, overdue RFQs, and now above-historical-pricing purchases, all from real queries (`src/lib/insights.ts`) — empty until there's data to support it |
| 24 | Notifications | FULL | In-app bell (poll-based), role- and user-targeted, fired on approval-required/quote-received/invoice-discrepancy |
| 25 | Audit logs | FULL | Every mutation writes AuditLog; viewer at `/settings/audit-log` |
| 26 | Document library | FULL | Upload/download/list, tenant- and entity-ownership-checked; local disk storage (not object storage — see KNOWN_LIMITATIONS.md) |
| 27 | Background job system | FULL | Persisted Job table, retries/backoff/dead-letter, worker process + inline dev fallback |
| 28 | API documentation | FULL | Real OpenAPI 3.0 spec (`src/lib/openapi.ts`) served at `/api/v1/openapi.json` (paste into Swagger Editor/Postman) with a rendered index at `/api-docs`, both public; hand-maintained API_DOCUMENTATION.md kept as a narrative companion |
| 29 | Automated testing | FULL | Unit/integration coverage (tenant isolation, permissions, policy engine, AI extraction, invoice matching, invoice document extraction, notifications, quote document extraction, price benchmarking, org-admin CRUD guards) plus real Playwright/Chromium end-to-end tests (`tests/e2e/`) driving Flow 1 (create purchase request), a UI-level cross-tenant access check, Flow 2 (RFQ → send → an unauthenticated supplier submitting a real quote through the bare-token portal in a separate browser context → compare → select → policy-engine-required approval → PO issuance), and now the PO lifecycle tail — advancing a PO through its status chain, recording a real receipt, and recording an invoice that either matches cleanly or surfaces a real three-way-match exception in the UI — through an actual browser end to end, wired into CI as a separate job. `playwright.config.ts` pins `workers: 1` — running spec files across multiple workers caused real, intermittent SQLite write contention against the shared e2e.db, not an app bug |
| 30 | Production deployment | NONE | Dockerfile/docker-compose exist; no environment has actually been provisioned from this session |

## Also built (beyond the MVP list, brief §23)

**Invoice three-way matching** — FULL for the matching logic itself: `runThreeWayMatch()` compares PO vs. receipt
vs. invoice and detects price differences, quantity differences, unauthorized freight, unexpected tax, items not
received, duplicate invoices, and unexplained additional fees — including the brief's exact worked example
(freight billed despite a freight-included quote). Invoice entry now also supports upload + AI-assisted extraction
(`src/lib/ai/invoiceDocumentExtraction.ts`, mirroring the quote extraction pipeline) for CSV, .xlsx, and PDF/image
(vision-capable providers only) — the buyer still reviews and submits the prefilled form, with extracted values
recorded to `InvoiceExtractionField` for traceability, same human-verification pattern as quotes. An org-wide
`/invoices` list (`src/app/(app)/invoices/page.tsx`) now exists alongside the per-PO view, gated by `invoice:manage`
(redirects to the dashboard without it) and tenant-scoped like every other list page, showing status/discrepancy
count/amount/PO/supplier per invoice with a discrepancy-count summary. FULL.

**Purchasing-intelligence price benchmarking (brief §25)** — FULL for what's built: `recomputePriceBenchmarks()`
(`src/lib/priceBenchmark.ts`) rebuilds an org's `PriceBenchmark` rows from real, committed `PurchaseOrderLineItem`
prices on issued POs (never quotes/estimates) every time a PO is issued, bucketed by category (falling back to
manufacturer when category is unset) and unit of measure over a 180-day rolling window. A quote priced >15% above
the org's own historical average for the same bucket is flagged with an "Above historical pricing" note on the
compare page and rolled into the dashboard's purchasing-insights panel. No dedicated benchmark-history UI exists —
the only exposure is the derived flag/insight — and because `category` is rarely populated on purchase request
line items today, most real benchmarking currently falls back to the manufacturer-only bucket rather than a true
category bucket. Verified via unit tests (`tests/price-benchmark.test.ts`) and a live smoke test issuing real POs
against a running standalone server.

**Rule:** a module with no working UI shows an explicit "Planned" state (`src/components/PlannedModule.tsx`) that
names the backing schema — never a form that appears to save but doesn't.
