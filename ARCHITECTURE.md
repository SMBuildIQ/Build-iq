# BuildIQ Architecture (Current + Target)

> Status: **Audit complete. No major migration started.**  
> Backup branch: `cursor/backup-pre-platform-rebuild-dc6e`  
> Working plan branch: `cursor/platform-audit-plan-dc6e`

## Current architecture (as shipped today)

```
┌─────────────────────────────────────────────────────────┐
│  Browser / PWA / Capacitor WebView (remote URL)         │
│  Next.js App Router UI (React 19)                       │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP cookie JWT
┌──────────────────────────▼──────────────────────────────┐
│  Next.js API routes (/api/*)                            │
│  Prisma 5 → SQLite                                      │
│  Local disk uploads/ · Stripe (or mock) · OpenAI (opt)  │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology | Notes |
|---|---|---|
| UI | Next.js 16 App Router, React 19, Tailwind | Phone-first shell + marketing pages |
| Auth | jose HS256 JWT in HTTP-only cookie, bcrypt | 30-day tokens; `tokenVersion` revoke |
| DB | Prisma + **SQLite** | Multi-tenant via `Company` / `Membership` |
| Files | Local `uploads/` directory | Not object storage |
| Payments | Stripe Payment Request + **mock wallets** | Silent mock if keys missing |
| AI | Optional OpenAI; local fallback takeoff | Filename/sf-based, not plan vision |
| Mobile | PWA + Capacitor config | **No `ios/` or `android/` projects**; remote WebView |
| Deploy | Docker standalone | Requires runtime `AUTH_SECRET` |

## Target architecture (recommended — pending your approval)

**Do not wrap the entire product forever in a bare WebView.** Apple Guideline 4.2 and your offline/jobsite requirements need a real native client.

**Lowest-risk path that supports both stores:**

```
┌──────────────────────┐     ┌──────────────────────┐
│  Expo (React Native) │     │  Next.js Web (admin /│
│  iOS + Android apps  │     │  estimating desktop) │
└──────────┬───────────┘     └──────────┬───────────┘
           │  HTTPS JSON API            │
┌──────────▼────────────────────────────▼───────────┐
│  Next.js (or extracted Nest/Hono) API             │
│  Prisma → PostgreSQL                              │
│  S3-compatible object storage                     │
│  Redis (rate limits, queues, sessions)            │
│  Stripe · email provider · push (APNs/FCM)        │
└───────────────────────────────────────────────────┘
```

### Why this split

1. **Reuse** the working estimating, company, project, takeoff, and shop business logic as a versioned API.
2. **Expo** gives one TypeScript codebase for iOS + Android, EAS Build, SecureStore, camera, push, biometrics, offline SQLite — matching your requirements without two native teams.
3. **Keep Next.js web** for office estimators who prefer large screens; do not force every workflow into a phone UI.
4. **PostgreSQL** is required for multi-tenant production, transactions, and migrations.

### Alternatives considered

| Option | Verdict |
|---|---|
| Continue Next.js + Capacitor WebView only | **Insufficient** for offline queues, secure token storage, Guideline 4.2, and 25-module field UX |
| React Native + Expo + shared API | **Recommended** — lowest risk vs full requirements |
| Flutter | Viable, but Dart duplicates TS skills; higher rewrite cost |
| Native Swift + Kotlin | Highest polish, **2× cost**; wrong until product-market fit on core modules |

## Folder structure (target mobile app — not created yet)

```
apps/
  mobile/                 # Expo Router app
    app/                  # screens (file-based routes)
    src/
      components/         # reusable UI
      features/           # domain modules (projects, estimates, …)
      services/           # API clients
      state/              # Zustand/TanStack Query
      storage/            # SecureStore, SQLite offline
      theme/              # design tokens
      config/             # env (dev/staging/prod)
  web/                    # existing Next.js app (moved)
packages/
  api-contract/           # shared Zod types / OpenAPI
  permissions/            # RBAC matrix shared by API + clients
services/
  api/                    # Next API or extracted service
docs/                     # architecture, security, privacy, checklists
```

## Module status

See [MODULE_STATUS.md](./MODULE_STATUS.md).

## Decision gate

No Expo scaffold, DB migration to Postgres, or deletion of existing features proceeds until you approve **Recommended architecture** and answer the decisions in [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md).
