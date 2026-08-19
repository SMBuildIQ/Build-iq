# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router UI, React server components)       │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTP, cookie session (jose HS256 JWT)
┌───────────────────────────────▼───────────────────────────────────┐
│  Next.js route handlers                                          │
│    /api/v1/*        — authenticated, tenant-scoped (withAuth)    │
│    /api/v1/portal/*  — public, token-authenticated supplier portal│
│    src/proxy.ts       — edge session presence check (Next 16     │
│                          renamed Middleware → Proxy)              │
├────────────────────────────────────────────────────────────────┤
│  Domain services (src/lib)                                       │
│    auth/       session, password hashing, request-scoped context │
│    permissions/ RBAC catalog + checks                            │
│    policy/      deterministic approval/negotiation-authority rules│
│    ai/          provider-agnostic AI abstraction + activity log   │
│    jobs/        background job queue (Job table + worker)        │
│    audit.ts     every state change → AuditLog                    │
├────────────────────────────────────────────────────────────────┤
│  Prisma → SQLite (dev) / PostgreSQL (production)                 │
└────────────────────────────────────────────────────────────────┘
```

## Multi-tenancy

Tenancy is `User → Membership → Organization`, with `Location` (branch), `Role`/`Permission` scoped per
organization. There is no shared-schema row-level security in the SQLite dev provider, so isolation is enforced at
the application layer:

1. `getAuthContext()` (`src/lib/auth/context.ts`) resolves the session cookie to a `{ userId, organizationId, ... }`
   context — never trusts a client-supplied organization id.
2. `withAuth()` (`src/lib/api/handler.ts`) wraps every `/api/v1` handler, guaranteeing a handler never runs without
   that context.
3. Every tenant-scoped Prisma query filters by `organizationId` explicitly — list queries via `where: {
   organizationId }`, single-record loads via `findFirst({ where: { id, organizationId } })` so a cross-tenant id
   returns 404, not 403 (no confirmation the record exists elsewhere).
4. `tests/tenant-isolation.test.ts` proves this at the query-pattern level: a record created in org A is
   unreachable via org B's identical query shape.

**Production hardening path:** migrating `prisma/schema.prisma`'s `datasource` from `sqlite` to `postgresql`
preserves every model as-is (see `DATABASE_SCHEMA.md`). On Postgres, add row-level security policies keyed on
`organization_id` as defense-in-depth beneath the application-layer checks above — the query patterns already
match what RLS needs.

## RBAC

Permissions are a fixed catalog of keys (`src/lib/permissions/catalog.ts`, e.g. `purchase_request:create`,
`approval:decide`). Screens and API routes check permission keys via `requirePermission()`, never role names.
`Role` and `RolePermission` are database rows scoped per organization — `DEFAULT_ROLES` in the catalog is only the
seed data new organizations get; permissions can diverge per org from there without a code change.

The one exception: `company_owner` carries standing override authority on approval steps regardless of the
specific role a policy rule names, mirroring real purchasing-org hierarchy (see
`src/app/api/v1/approval-steps/[id]/decide/route.ts`).

## The policy engine is not the AI

`src/lib/policy/engine.ts` is a pure, deterministic function over `PolicyRule` rows: given a purchase amount and
context (substitution present, international supplier, etc.), it returns exactly which approval steps are
required and how many bids are needed. The AI layer (`src/lib/ai`) can produce a *recommendation* — which quote to
pick, what to ask a supplier for in negotiation — but no AI code path creates an `ApprovalRequest`, marks a
`PurchaseRequest` approved, or issues a `PurchaseOrder`. Those transitions only happen through
`/api/v1/purchase-requests/[id]/select-quote` and `/api/v1/purchase-orders`, both of which call the policy engine
first. `NegotiationAuthority.autoNegotiateEnabled` defaults to `false` for every new org, and even when enabled,
`allowFinalize` is a schema field with no code path that reads it as permission to finalize a purchase — autonomous
finalization is a future milestone, not a flag this codebase honors yet.

## AI abstraction

Every AI-backed feature depends on the `AIProvider` interface (`src/lib/ai/types.ts`), never a vendor SDK directly:

- `MockProvider` — deterministic, offline, zero-cost. Backs local dev (default), CI, and demos. Extraction and
  recommendation features fall back to real (if simple) heuristics under this provider — see
  `src/lib/ai/heuristicExtractor.ts` — rather than returning canned data.
- `AnthropicProvider` — thin fetch wrapper over the Messages API, used when `AI_PROVIDER=anthropic` and
  `ANTHROPIC_API_KEY` is set.

Every call — regardless of provider — is recorded to `AIActivityLog` (model, prompt version, input, output,
confidence, token usage, estimated cost) via `src/lib/ai/log.ts`. Human corrections to AI output are recorded to
`AICorrection` and never overwrite the original AI value.

## Background jobs

`Job` is a persisted table (status, attempts, `maxAttempts`, `lastError`, `runAt` for backoff). Two things read it:
`scripts/worker.ts` (a polling loop — the production execution path) and inline processing right after `enqueueJob`
in dev/demo, so a feature is visible immediately without a second process running. Both call the same processor
registry (`src/lib/jobs/queue.ts`), so there is no behavioral difference between "background" and "inline" beyond
timing.

## Supplier portal

Suppliers never get a platform account (brief requirement). `RFQSupplier.secureToken` is a 24-byte random value,
looked up by unique index at `/portal/rfq/[token]` and `/api/v1/portal/rfq/[token]/quote`. Those are the only two
places in the app that authorize by bare token instead of a session — deliberately isolated in `src/app/portal` and
`src/app/api/v1/portal` and excluded from the tenant-session proxy check in `src/proxy.ts`.

## Numbering

Purchase request, RFQ, and PO numbers are per-organization sequential counters (`Organization.prNumberSeq` etc.),
incremented inside a transaction (`src/lib/numbering.ts`) via Prisma's `{ increment: 1 }`, which compiles to a
single atomic `UPDATE ... RETURNING` at the SQL level under both providers — not a read-then-write in application
code. Verified directly against real PostgreSQL 16: 50 concurrent increments against the same counter produced 50
unique, contiguous numbers with zero duplicates. Race-safe under both providers today, not just under SQLite.

## Deployment target

Dev: SQLite, `npm run dev` + `npm run worker`. Production target: PostgreSQL, `next build` → `output: standalone`,
the API/web process plus a separately-scaled worker process — see `Dockerfile` and `docker-compose.yml`. A real,
credentialed S3 bucket and a managed Postgres instance are the two infrastructure pieces this repo does not yet
provision — see `KNOWN_LIMITATIONS.md`. The S3 *driver* itself is built and verified, not just planned (below).

**Object storage — dual-driver, verified against a real S3-API server.** `src/lib/documents/storage.ts` dispatches
to `localStorage.ts` (default) or `s3Storage.ts` (`STORAGE_DRIVER=s3`); both implement the same two-function
interface and the same `storageKey` shape (`organizationId/uuid-filename`), so `Document` and every caller are
driver-agnostic. `tests/s3-storage.test.ts` runs the S3 driver (`@aws-sdk/client-s3`) against `s3rver`, a real
in-process S3-API-compatible server — not a mock of what the SDK "should" do — and round-trips files byte-for-byte
through it. That surfaced one real bug: the SDK v3 defaults `PutObjectCommand` to streaming, trailer-based checksum
calculation, which real AWS supports but hangs (not errors) against non-AWS S3-compatible servers; fixed with
`requestChecksumCalculation: "WHEN_REQUIRED"` on the `S3Client`. The local driver was smoke-tested end to end
through the real running app (standalone server, real register → supplier → upload → download round trip) to
confirm the refactor didn't regress the default path. Not yet exercised against a real bucket (AWS or MinIO) — no
credentials in this environment — so the endpoint/path-style/credentials plumbing is verified against a compatible
API surface, not against AWS itself.

**Postgres migration — verified, not just planned.** A local PostgreSQL 16 instance was used to actually run this
migration end to end (not just review it): `prisma/schema.prisma`'s `datasource.provider` changed from `"sqlite"`
to `"postgresql"` (the only line that needs to change — no model changes), `prisma db push` applied the full ~40-
model schema cleanly, the entire unit/integration suite (119 tests) passed unchanged, a production build
succeeded, and the Playwright e2e suite — which needs `workers: 1` against SQLite to avoid real write contention
(see module #29 in `MODULE_STATUS.md`) — passed reliably with concurrent workers against Postgres with no such
pin, confirming that ceiling is a SQLite-specific limitation, not a fragile test suite. None of this is
committed: the repo's dev/CI database stays SQLite by design (see `KNOWN_LIMITATIONS.md`), and the actual
migration remains a deliberate deployment decision — this just confirms the path is real and low-risk when that
decision is made, not aspirational.

**Gotcha — relative SQLite paths under `output: standalone`:** Next's standalone build copies the generated Prisma
client to a new location (`.next/standalone/node_modules/.prisma/client`), and Prisma resolves a *relative*
`file:` datasource URL against wherever that copy ends up at runtime — not the process's actual working directory.
A relative `DATABASE_URL` that works perfectly under `next dev` or `next start` will silently point at a
nonexistent database under the standalone server (`node .next/standalone/server.js`, which is what `Dockerfile`
actually runs). `postgresql://` URLs are unaffected (they're never relative). If you ever run the SQLite fallback
path outside dev, use an absolute `file:` path — see the Dockerfile/docker-compose.yml comments.
