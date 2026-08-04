# Implementation checklist

Track every task as: `pending` · `active` · `blocked` · `completed`

**Backup branch (do not rewrite):** `cursor/backup-pre-platform-rebuild-dc6e`  
**Audit / plan branch:** `cursor/platform-audit-plan-dc6e`  
**Original project:** preserved; do not delete

---

## Gate 0 — Audit & decisions (current)

| ID | Task | Status |
|---|---|---|
| G0.1 | Full repository audit | completed |
| G0.2 | Backup branch created | completed |
| G0.3 | ARCHITECTURE / MODULE_STATUS / KNOWN_LIMITATIONS docs | completed |
| G0.4 | Owner decisions (see bottom) | **blocked** — waiting on you |
| G0.5 | Explicit approval to start Phase 1 | **blocked** — waiting on you |

---

## Phase 1 — Stabilize existing API (keep Next.js runnable)

*Complexity: Medium — invasive auth/RBAC/DB, but no mobile rewrite yet.*

| ID | Task | Status |
|---|---|---|
| P1.1 | Fail closed on payments when Stripe unset in production | pending |
| P1.2 | Logout bumps `tokenVersion` / session revoke | pending |
| P1.3 | Fix SW: never cache authenticated HTML | pending |
| P1.4 | Introduce Postgres + versioned Prisma migrations | pending |
| P1.5 | RBAC matrix + backend `requirePermission()` on every mutating route | pending |
| P1.6 | Expand roles (Owner→Guest) with auditable matrix | pending |
| P1.7 | Password reset + email verification (email provider) | pending |
| P1.8 | Account lockout / progressive throttling (Redis or DB) | pending |
| P1.9 | Soft-delete + audit log tables for financial/admin actions | pending |
| P1.10 | Object storage + signed URLs for uploads | pending |
| P1.11 | Call `assertProductionSecrets` at boot | pending |
| P1.12 | Auth/isolation/upload automated tests | pending |
| P1.13 | Publish OpenAPI / Zod API contract package | pending |

---

## Phase 2 — Documentation scaffolding (honest stubs)

*Complexity: Low.*

| ID | Task | Status |
|---|---|---|
| P2.1 | SETUP.md, SECURITY.md, PRIVACY_DATA_MAP.md | pending |
| P2.2 | PERMISSIONS_MATRIX.md (full role × action) | pending |
| P2.3 | API_DOCUMENTATION.md, DATABASE_SCHEMA.md | pending |
| P2.4 | TESTING.md, DEPLOYMENT.md | pending |
| P2.5 | IOS_RELEASE_CHECKLIST.md, ANDROID_RELEASE_CHECKLIST.md | pending |
| P2.6 | Threat model (auth, tenants, files, payments, AI) | pending |
| P2.7 | Accessibility audit checklist | pending |

---

## Phase 3 — Expo mobile app scaffold (after approval)

*Complexity: High — new app; API must be stable.*

| ID | Task | Status |
|---|---|---|
| P3.1 | Monorepo layout `apps/mobile` + `apps/web` without deleting web | pending |
| P3.2 | Expo Router, theme tokens, env configs (dev/staging/prod) | pending |
| P3.3 | Secure token storage (Keychain/Keystore via SecureStore) | pending |
| P3.4 | Auth screens: login, signup, reset, verify | pending |
| P3.5 | Bottom tabs + stack; deep links; App Links / Universal Links | pending |
| P3.6 | Projects list/detail consuming API | pending |
| P3.7 | Loading / empty / error states; no dead buttons | pending |
| P3.8 | ESLint, Prettier, typecheck, CI | pending |

---

## Phase 4 — Jobsite essentials

*Complexity: High.*

| ID | Task | Status |
|---|---|---|
| P4.1 | Camera + photo upload with progress / retry | pending |
| P4.2 | Offline cache + sync queue (photos, logs, punch) | pending |
| P4.3 | Push notifications + preference center | pending |
| P4.4 | Biometric unlock for returning users | pending |
| P4.5 | PDF viewer for plans | pending |

---

## Phase 5 — Construction modules (incremental)

*Complexity: Very high overall; ship module-by-module.*

Each module: API + permissions + mobile screens + tests + MODULE_STATUS update.

| ID | Module | Status |
|---|---|---|
| P5.1 | Dashboard (real KPIs) | pending |
| P5.2 | Clients | pending |
| P5.3 | Leads/CRM | pending |
| P5.4 | Estimates approval workflow | pending |
| P5.5 | Document folders + versions | pending |
| P5.6 | Subcontractor bid invites | pending |
| P5.7 | Purchase orders | pending |
| P5.8 | Scheduling | pending |
| P5.9 | Daily logs (offline) | pending |
| P5.10 | RFIs / Submittals / Change orders | pending |
| P5.11 | Selections | pending |
| P5.12 | Invoices / progress billing | pending |
| P5.13 | Budget vs actual | pending |
| P5.14 | Client portal | pending |
| P5.15 | Vendor/sub portal | pending |
| P5.16 | Punch lists (offline) | pending |
| P5.17 | Warranty | pending |
| P5.18 | AI assistant with draft labels + human review gates | pending |

---

## Phase 6 — Store release readiness

*Complexity: Medium–High; blocked on your approval to submit.*

| ID | Task | Status |
|---|---|---|
| P6.1 | Privacy inventory matches code | pending |
| P6.2 | Store assets list (no invented branding) | pending |
| P6.3 | TestFlight + Play internal testing | pending |
| P6.4 | Accessibility WCAG 2.2 AA pass | pending |
| P6.5 | Security review / dependency scan | pending |
| P6.6 | Crash reporting + monitoring | pending |
| P6.7 | **You approve** pricing / payments / public deploy / store submit | blocked |

---

## Complexity summary

| Phase | Complexity | Why |
|---|---|---|
| 0 Audit | Done | — |
| 1 API harden | Medium | Auth, RBAC, Postgres, storage — touches every route |
| 2 Docs | Low | Writing + inventory |
| 3 Expo scaffold | High | New client + env + navigation |
| 4 Jobsite | High | Offline sync is the hardest subsystem |
| 5 Modules | Very high | 15+ product domains; each needs real backend rules |
| 6 Stores | Medium–High | Compliance + devices + your approval gates |

---

## Decisions you must make before Phase 1 / 3

1. **Architecture:** Approve **Expo + shared Next API + Postgres** (recommended), or choose Capacitor-only / Flutter / native?
2. **Company legal entity:** Name, address, support email, governing law state for Privacy/Terms?
3. **Hosting:** Preferred cloud (Vercel + Neon/RDS, Railway, AWS, other)?
4. **Email provider:** Resend, SES, Postmark, other?
5. **Object storage:** S3, R2, GCS?
6. **Payments scope:** Physical materials only (Stripe) vs digital subscriptions (IAP required)? Pricing approval later — confirm model now.
7. **Spruce:** Stay mock until ECI credentials, or prioritize live integration?
8. **Brand:** Keep BuildIQ name/colors, or provide brand kit?
9. **First mobile OS priority:** iOS first, Android first, or both in parallel?
10. **Monorepo:** Approve moving toward `apps/web` + `apps/mobile` without deleting the current app?

## First safe implementation step (after your approval)

**Phase 1.1–1.3 only:** fail-closed payments, logout session revoke, fix service worker caching — small, reversible commits that keep the current web app runnable and reduce store/security risk **without** starting the Expo migration.
