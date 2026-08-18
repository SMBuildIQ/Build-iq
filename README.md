# BuildIQ Purchasing

A multi-tenant, AI-powered B2B purchasing platform: describe a purchase in plain English, source it against your
supplier base, compare quotes side by side, negotiate with AI assistance, route it through configurable approvals,
issue the PO, track delivery, and receive goods — with every AI decision logged and every dollar amount gated by a
deterministic policy engine, never by the AI itself.

**Status:** early build. The core purchasing loop (Purchase Request → RFQ → Supplier Portal → Quotes → AI
Recommendation → Negotiation → Approval → Purchase Order → Tracking → Receiving) is real and tested end to end.
Invoice matching, notifications, the audit-log/document UI, and native integrations are modeled in the schema but
not yet exposed — see [MODULE_STATUS.md](./MODULE_STATUS.md).

| Doc | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, tenant isolation, AI abstraction, policy engine |
| [MODULE_STATUS.md](./MODULE_STATUS.md) | What's real vs. planned |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Data model |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | `/api/v1/*` reference |
| [SECURITY.md](./SECURITY.md) | Tenant isolation, RBAC, auth, controlled AI autonomy |
| [SETUP.md](./SETUP.md) | Run locally |

## What's implemented

- **Multi-tenant core** — Organization → Location → User → Membership → Role → Permission, fully isolated per
  organization, with automated tests proving cross-tenant queries return nothing (`tests/tenant-isolation.test.ts`).
- **RBAC** — permission keys are never hard-coded into a screen; every route checks a permission via
  `src/lib/permissions`, and role→permission grants live in the database per organization.
- **AI purchasing assistant** — plain-English purchase description → structured Purchase Request, with missing
  critical fields flagged instead of guessed (`src/lib/ai/purchaseRequestExtraction.ts`).
- **AI provider abstraction** — every AI-backed feature goes through `src/lib/ai/types.ts`'s `AIProvider` interface.
  A deterministic mock provider (zero cost, zero network) backs local dev, CI, and demos; an Anthropic adapter is
  wired in for production. Every call is logged (model, prompt version, tokens, cost, confidence) to `AIActivityLog`.
- **Deterministic policy engine** — approval thresholds, minimum bid counts, international-supplier and
  substitution rules live in `PolicyRule` rows per organization and are evaluated by `src/lib/policy/engine.ts`.
  The AI layer can recommend; only this engine decides what's actually allowed.
- **Full sourcing loop** — supplier database → RFQ generation → email/portal delivery (via a real background job) →
  a token-authenticated **supplier portal** (no account required) for quote submission → manual quote entry for
  PDF/Excel/email responses → side-by-side comparison with computed total landed cost → AI recommendation with
  visible rationale → assisted AI-drafted negotiation (human sends, never the AI) → policy-routed approval →
  PO issuance → order-status tracking → receiving.
- **Savings tracking** — `SavingsRecord` distinguishes negotiated, benchmark, and realized savings; the dashboard
  only ever shows verified realized savings, never inflated figures.
- **Background jobs** — a real `Job` table with retries/backoff/dead-letter, a production worker process
  (`npm run worker`), and inline processing in dev so a demo doesn't require a second process.
- **Audit trail** — every state-changing action writes an `AuditLog` row (who, what, when, before/after).

## What's explicitly not built yet

Modeled in the schema, not yet exposed in the UI/API: three-way invoice matching, in-app/email notifications, the
audit-log and document-library viewers, purchasing-intelligence benchmarking, ERP/accounting integrations, and a
native mobile client. See [MODULE_STATUS.md](./MODULE_STATUS.md) for the full breakdown — nothing in that list is
faked; the nav shows an honest "Planned" state instead of a non-functional screen.

## Quick start

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed      # demo@buildiq.app / demo12345
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For the RFQ-send background job to run outside of the inline dev fallback, also run:

```bash
npm run worker
```

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path locally (`file:./dev.db`); PostgreSQL in production — see ARCHITECTURE.md |
| `AUTH_SECRET` | 32+ char session JWT signing secret |
| `AI_PROVIDER` | `mock` (default, offline/free) or `anthropic` |
| `ANTHROPIC_API_KEY` | Required when `AI_PROVIDER=anthropic` |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional; RFQ emails log to console when unset |

## Stack

Next.js (App Router) · TypeScript · Prisma · SQLite (dev) / PostgreSQL (production) · Tailwind CSS · jose (JWT) ·
bcryptjs · zod
