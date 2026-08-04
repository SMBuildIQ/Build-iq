# AI Cabinetry Proposals — Integration Audit

**Status:** Plan for review — **no major schema migrations until approved**  
**Date:** 2026-08-04  
**Product:** BuildIQ by Supply Monkey Lumber & Materials Co  
**Branch:** `cursor/cabinetry-integration-audit-dc6e`

This document answers the cabinetry assignment’s immediate request: reuse what exists, name what is missing, and define phases — **without** starting a second SaaS, second login, or major DB rewrite.

---

## Reality check (critical)

The cabinetry brief assumes a stack that **does not fully exist today**. BuildIQ must grow into those capabilities rather than pretend they are already present.

| Assumed in brief | Actual BuildIQ today |
|---|---|
| Monorepo with web + mobile + API | **Single Next.js app** (App Router UI + `/api`) |
| PostgreSQL + RLS | **SQLite** via Prisma; **app-layer** company filters (no RLS) |
| Supabase authentication | **jose HS256 JWT** cookie + bcrypt (`src/lib/auth.ts`) |
| Customers / contacts tables | **Do not exist** |
| Generic files / object storage | **Blueprint** rows + local `uploads/` disk |
| Proposal / acceptance / e-sign | **Do not exist** (internal `BidPackage` only) |
| Customer portal | **PLANNED** empty module |
| In-app notifications | **PLANNED** — Resend email helper only |
| Expo mobile app | **Not started** — PWA + Capacitor config; no `ios/`/`android/` |
| Stripe deposits + webhooks | Shop **Order** PaymentIntents + wallets; **no webhook route**, no proposal deposits |

**Integration rule:** Cabinetry ships **inside** this app, reusing `Company`, `User`, `Membership`, `Project`, auth, RBAC, uploads, Stripe helpers, PDF/Excel, AI scan, `AuditLog`, and AppShell. Missing platform pieces (Customer, File, Proposal, Notification, portal, webhooks) are **shared platform foundations** added once for BuildIQ — then cabinetry consumes them. They are not cabinetry-only silos.

---

## 1. Existing components that can be reused

| Component | Location | Cabinetry use |
|---|---|---|
| Company / Membership tenancy | `prisma` `Company`, `Membership` | Every cabinetry row scoped by `companyId` |
| Users + roles | `User`, `src/lib/permissions.ts` | Salesperson / estimator assignment; new cabinetry perms |
| Session auth | `src/lib/auth.ts`, `requirePermission` | Same login; no second auth |
| Projects | `Project`, `/api/projects/*`, `/projects/[id]` | Opportunity ↔ existing or new project |
| Plan upload + OCR/vision | `Blueprint`, `src/lib/plans/*`, `src/lib/ai/vision-takeoff.ts` | Cabinetry document ingest + AI extraction input |
| Plan measuring UI | `PlanViewer`, `/projects/[id]/plans/[blueprintId]` | Field dimensions / plan review patterns |
| Cost rollup patterns | `src/lib/estimate/calculator.ts` | Inspiration only — cabinetry pricing is catalog-driven |
| PDF generation | `src/lib/export/pdf.ts` (pdfkit) | Extend for Supply Monkey cabinetry proposal PDF |
| Excel export | `src/lib/export/excel.ts` | Catalog import/export templates |
| Stripe + Apple/Google Pay | `src/lib/commerce/payments.ts`, `WalletPayButtons`, `/api/checkout*` | Deposit PaymentIntents (extend; do not duplicate) |
| Orders / payment fields | `Order` | Pattern for deposit payment records (or shared `Payment`) |
| Email | `src/lib/email.ts` (Resend) | Clarification / proposal sent / deposit emails |
| Audit logging | `AuditLog`, `src/lib/audit.ts` | All cabinetry lifecycle events |
| Design system | `globals.css`, `AppShell`, btn/input classes | Cabinetry UI |
| Modules hub | `src/lib/modules/registry.ts`, `/modules` | Register Cabinetry as PLANNED → PARTIAL → FULL |
| Shop cabinetry package | `cabinetry-kitchen-bath` in packages | Optional bridge to procurement — **not** the proposal catalog |

---

## 2. Existing entities to extend (not replace)

| Entity | Extension |
|---|---|
| `Company` | Relations to cabinetry catalogs, opportunities, pricing rules |
| `User` / `Membership` | Cabinetry permissions; salesperson / estimator FKs |
| `Project` | Optional 1:N cabinetry opportunities; project “Cabinetry” tab |
| `Blueprint` **or** new shared `File` | Prefer introducing shared `ProjectFile` (see §3) and linking cabinetry docs to it; keep `Blueprint` for estimating plans |
| `Order` / payments | Link deposits to proposal version; add webhook + idempotency |
| `AuditLog` | New `action` / `entityType` values (`cabinetry.*`) |
| `ModuleRegistry` | Status tracking for cabinetry submodule |

**Do not** fork `Company`, `User`, `Project`, or auth.

---

## 3. New cabinetry tables (after plan approval)

IDs: Prisma `@default(cuid())` today (compatible with UUID migration later). All cabinetry-owned rows include `companyId`, `createdAt`, `updatedAt`, `createdById` where applicable, `status` / version fields as needed.

### Platform foundations (shared — build once)

These are required by the brief but missing. Add as **BuildIQ platform**, not cabinetry-only duplicates:

| Table | Purpose |
|---|---|
| `customers` | Builder / homeowner / GC party under a company |
| `contacts` | People on a customer (architect, designer, etc.) |
| `project_files` | Generic private files (company, project, category, version, uploader, processing status) |
| `notifications` | In-app notification rows (+ email fan-out via existing Resend) |
| `payments` | Normalized payment ledger (Stripe PI, amount, status, links to order **or** cabinetry deposit) — *or* extend `Order` carefully |

### Cabinetry-specific

| Table | Purpose |
|---|---|
| `cabinetry_opportunities` | Stage machine; FKs: company, customer, project, salesperson, estimator, product line |
| `cabinetry_rooms` | Rooms on an opportunity |
| `cabinetry_product_lines` | Mesa / Summit / Pinnacle (editable specs — **not** hard-coded prices) |
| `cabinetry_catalog_items` | Company catalog; pricing version / effective dates |
| `cabinetry_finishes` | Finish options |
| `cabinetry_door_styles` | Door styles |
| `cabinetry_accessories` | Accessories |
| `cabinetry_pricing_rules` | Markup, margin, freight, waste, upgrades |
| `cabinetry_estimates` | Estimate header + pricing snapshot refs |
| `cabinetry_estimate_items` | Schedule lines (cost/sell; review status) |
| `cabinetry_assumptions` | Documented assumptions |
| `cabinetry_clarifications` | Q&A / block-on-critical |
| `cabinetry_ai_extractions` | Structured AI JSON + source file/page + confidence + review status |
| `cabinetry_proposals` | Proposal header |
| `cabinetry_proposal_versions` | Immutable sent versions + stored PDF path |
| `cabinetry_proposal_items` | Line snapshot for a version |
| `cabinetry_approvals` | Approval steps + actor + notes |
| `cabinetry_acceptances` | Customer accept / e-sign record |

**Tenant isolation:** Continue `where: { companyId }` + `requirePermission` on every API. Postgres RLS is a **later** migration when switching off SQLite — not a blocker for Phase 1 app-layer isolation.

---

## 4. Existing API routes to reuse

| Route family | Reuse |
|---|---|
| `/api/auth/*` | Login / session — unchanged |
| `/api/projects`, `/api/projects/[id]` | Create/link project for opportunity |
| `/api/projects/.../blueprints*` | Interim file upload until `project_files` lands |
| `/api/checkout`, `/api/checkout/wallet` | Pattern for deposit PaymentIntent + wallets |
| `/api/account/export`, delete | Include cabinetry data when deleting company |
| `/api/health` | Unchanged |

---

## 5. New API routes required (namespaced)

```
/api/cabinetry/opportunities
/api/cabinetry/opportunities/[id]
/api/cabinetry/opportunities/[id]/documents
/api/cabinetry/opportunities/[id]/extract          # AI job
/api/cabinetry/opportunities/[id]/ai-review
/api/cabinetry/opportunities/[id]/schedule
/api/cabinetry/opportunities/[id]/clarifications
/api/cabinetry/opportunities/[id]/estimates
/api/cabinetry/opportunities/[id]/proposals
/api/cabinetry/proposals/[id]/versions
/api/cabinetry/proposals/[id]/approve
/api/cabinetry/proposals/[id]/send
/api/cabinetry/proposals/[id]/pdf
/api/cabinetry/proposals/[id]/accept               # portal / signed accept
/api/cabinetry/proposals/[id]/deposit              # server-authoritative amount
/api/cabinetry/catalog/*
/api/cabinetry/product-lines
/api/cabinetry/pricing-rules
/api/cabinetry/reports
/api/webhooks/stripe                                 # platform — verify deposits + orders
```

All cabinetry mutating routes: `requirePermission("cabinetry:…")` + company ownership checks. **Never trust client deposit amounts.**

---

## 6. UI components to reuse

- `AppShell` / marketing shell  
- Button / input / surface / status pill classes  
- `PlanViewer` patterns for document preview + AI review  
- `BotRunner` pattern for long-running AI extract progress (SSE or job poll)  
- `WalletPayButtons` for deposit  
- Modules empty-state pattern (honest “Planned / Partial”)  

---

## 7. Current file-upload capabilities

- **Works:** Auth-gated upload to `uploads/`, MIME + magic-byte validation, Blueprint metadata, preview raster, OCR/vision scan, measurements  
- **Missing for cabinetry categories:** Generic file entity, category enum (Floor Plans, Elevations, Appliance Specs, …), opportunity FK, processing/AI review status on a shared file, object storage / signed URLs  

**Plan:** Introduce `project_files` with cabinetry categories; optionally copy or link existing Blueprint rows into an opportunity. Do **not** create a second storage root.

---

## 8. Current proposal capabilities

| Need | Status |
|---|---|
| Customer-facing proposal | **None** |
| Versioning / immutable PDF | **None** |
| Acceptance / e-sign | **None** |
| Portal view | **None** |
| Closest analog | Internal `BidPackage` + estimate PDF export |

Cabinetry proposals are a **new** subsystem that should become the shared “proposal engine” if other trades later need quotes — still one system, not a cabinetry-only portal fork.

---

## 9. Stripe and wallet payments

| Capability | Status |
|---|---|
| PaymentIntent create/confirm | Yes (`payments.ts`) |
| Apple Pay / Google Pay UI | Yes (`WalletPayButtons`) |
| Mock fail-closed in production | Yes |
| Stripe webhooks | **Missing** |
| Idempotency on PI → order | **Weak / missing** |
| Proposal deposit + balance | **Missing** |
| Live payments | **Do not activate** without owner approval |

Phase 1 deposit work: extend payment layer + webhook + link to `cabinetry_proposal_versions`; keep `ALLOW_MOCK_PAYMENTS` / test keys only until approved.

---

## 10. Permission architecture

**Extend** `src/lib/permissions.ts` (do not invent a second RBAC):

Suggested permissions:

- `cabinetry:view`
- `cabinetry:opportunity:write`
- `cabinetry:document:upload`
- `cabinetry:ai:run`
- `cabinetry:ai:review`
- `cabinetry:schedule:edit`
- `cabinetry:cost:view`
- `cabinetry:margin:view`
- `cabinetry:catalog:edit`
- `cabinetry:pricing:edit`
- `cabinetry:discount:apply`
- `cabinetry:proposal:approve`
- `cabinetry:proposal:send`
- `cabinetry:payment:record`
- `cabinetry:payment:refund`
- `cabinetry:reports:view`

Map heavily to `OWNER`, `ADMIN`, `ESTIMATOR`, `SALES`, `DESIGNER`, `ACCOUNTANT`. `HOMEOWNER` / portal role: view/accept/pay only — **never** cost/margin.

---

## 11. Migration risks

1. **SQLite → Postgres** while adding many tables — prefer designing Prisma models that are Postgres-ready; migrate engine before production multi-tenant cabinetry.  
2. **Customer introduction** — projects today have no customer FK; adding `customerId` nullable first avoids breaking existing jobs.  
3. **File model split** — Blueprint vs `project_files` needs a clear ownership story to avoid dual uploads.  
4. **Payment double-write** — Order vs Payment vs deposit; need one ledger story before live Stripe.  
5. **AI hallucination** — extraction must land in `cabinetry_ai_extractions` with review gates; never auto-write approved estimate prices.  
6. **Scope creep** — Phase 2/3 (GBB, CAD region highlight, manufacturer exports) must not block MVP acceptance criteria.  
7. **Mobile** — No Expo yet; Phase 1 mobile = responsive web/PWA; Expo screens only after Expo scaffold is approved.

---

## 12. Implementation phases (aligned to brief)

### Phase 0 — Plan lock (this document)

- Audit + module registry “Cabinetry = PLANNED”  
- **No** major migrations until owner review  

### Phase 1 — MVP (acceptance criteria 1–24)

Order of work:

1. Platform: `customers` + `contacts` (minimal)  
2. Platform: `project_files` + cabinetry categories (reuse upload security)  
3. Seed editable product lines Mesa / Summit / Pinnacle (specs in DB)  
4. Cabinetry opportunity CRUD linked to company + customer + project  
5. Document upload on opportunity  
6. AI extract → validated Zod JSON → `cabinetry_ai_extractions`  
7. Human AI Review screen (accept/edit/reject)  
8. Editable cabinet schedule (`cabinetry_estimate_items`)  
9. Catalog + CSV/XLSX import; pricing history  
10. Deterministic pricing engine (catalog + rules only)  
11. Margin/cost RBAC gates  
12. Clarifications workflow  
13. Proposal + versions + pdfkit PDF stored immutably  
14. Approval flow + audit  
15. Minimal customer portal routes (token or HOMEOWNER membership)  
16. Acceptance record  
17. Deposit PaymentIntent (server amount) + wallets + **webhook** + audit  
18. Nav: primary **Cabinetry** + project tab **Cabinetry**  
19. Reports (basic)  
20. Honest mobile: responsive web; Expo stubs only if Expo exists  

### Phase 2

Good/better/best; Mesa/Summit/Pinnacle side-by-side; clarification emails; change orders; manufacturer exports; install scheduling.

### Phase 3

Advanced CV takeoffs; VE recommendations; warranty; punch lists.

---

## 13. First safe code change (executed with this audit)

**Allowed without architectural migration:**

1. Add this audit document.  
2. Register **Cabinetry** in `PLATFORM_MODULES` / `MODULE_STATUS` as **PLANNED**.  
3. Add `/cabinetry` hub page with honest empty state listing subsections (Opportunities, Catalog, …) marked Planned — **no fake Save**.  
4. Add AppShell link to Cabinetry (planned).  

**Explicitly deferred until plan approval:**

- Prisma migrations for cabinetry / customer tables  
- Stripe webhook  
- Proposal PDF  
- AI extraction pipeline for cabinets  
- Live payments  

---

## AI safety (binding for implementers)

- Structured Zod-validated output only  
- Source file + page + confidence on every extracted line  
- Assumptions ≠ Confirmed  
- Pricing only from catalog / rules / authorized overrides  
- No send / charge / cross-tenant access without authorization  
- Treat plan text as untrusted (prompt-injection resistant)  
- Full audit trail  

---

## Decision checklist for owner

Before Phase 1 coding of schema:

- [ ] Approve this integration approach (platform foundations + cabinetry module in-app)  
- [ ] Confirm Customer model shape (builder vs homeowner vs both)  
- [ ] Confirm deposit % default and tax handling  
- [ ] Confirm portal auth (magic link vs HOMEOWNER membership)  
- [ ] Confirm Postgres migration timing relative to cabinetry Phase 1  
- [ ] Confirm Expo vs PWA-first for “mobile” acceptance criterion  

**Do not deploy publicly. Do not activate live Stripe. Do not rewrite working estimating/shop flows.**
