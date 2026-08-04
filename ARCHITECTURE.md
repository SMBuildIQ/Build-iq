# BuildIQ Architecture (Current + Target)

> Status: **Monorepo scaffold in progress** — see [`PLATFORM.md`](./PLATFORM.md)  
> Design specs: [`docs/design/DESIGN_SYSTEM.md`](./docs/design/DESIGN_SYSTEM.md) · [`docs/design/SCREENS.md`](./docs/design/SCREENS.md)  
> Backup branch: `cursor/backup-pre-platform-rebuild-dc6e`  
> Platform branch: `cursor/monorepo-expo-nestjs-dc6e`

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

## Target architecture (approved — scaffolded under `apps/`)

**Do not wrap the entire product forever in a bare WebView.** Apple Guideline 4.2 and your offline/jobsite requirements need a real native client.

```
┌──────────────────────┐     ┌──────────────────────┐
│  Expo (React Native) │     │  Next.js Web (admin /│
│  apps/mobile         │     │  apps/web :3001)     │
└──────────┬───────────┘     └──────────┬───────────┘
           │  HTTPS JSON API            │
┌──────────▼────────────────────────────▼───────────┐
│  NestJS API (apps/api :4000)                      │
│  Prisma → PostgreSQL                              │
│  S3-compatible object storage                     │
│  Redis (rate limits, queues, sessions)            │
│  Shared packages: types · validation · permissions│
│  · pricing · design-tokens                        │
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

## Folder structure (scaffolded)

```
apps/
  mobile/                 # Expo Router · Millwork Studio UI kit
  web/                    # Next.js dashboard (:3001)
  api/                    # NestJS + Prisma Postgres (:4000)
packages/
  design-tokens/ types/ validation/ permissions/ pricing/
docs/design/              # Exact design system + screen specs
```

Legacy soft-launch Next.js remains at repo root (`src/`, `prisma/` SQLite). See [`PLATFORM.md`](./PLATFORM.md).

## Module status

See [MODULE_STATUS.md](./MODULE_STATUS.md).

## Decision gate

**Approved:** Expo + NestJS + PostgreSQL + shared packages. Soft-launch root app stays until Nest API reaches feature parity. Live Stripe stays off without keys.
