# BuildIQ Platform Monorepo

> Status: **Scaffold live** on branch `cursor/monorepo-expo-nestjs-dc6e`  
> Design source of truth: [`docs/design/DESIGN_SYSTEM.md`](./docs/design/DESIGN_SYSTEM.md) · [`docs/design/SCREENS.md`](./docs/design/SCREENS.md)

The soft-launch Next.js + SQLite app remains at the **repo root** (`src/`, `prisma/`).  
The production target lives under **`apps/`** + **`packages/`**.

## Layout

```
apps/
  mobile/     # Expo Router · React Native (new architecture) · Millwork Studio UI
  web/        # Next.js App Router dashboard (port 3001)
  api/        # NestJS · Prisma PostgreSQL · Redis · S3 (port 4000)
packages/
  design-tokens/   # JSON · CSS vars · nativeTheme()
  types/           # Shared DTOs
  validation/      # Zod schemas
  permissions/     # RBAC matrix
  pricing/         # Estimate / deposit / category mapping
docs/design/       # Exact design system + screen specs
```

## Design system — “Millwork Studio”

Do not invent alternate palettes or generic SaaS styling. Tokens and component contracts are documented in `docs/design/`. Key rules:

- Sharp geometry (`radius: 0` default)
- Staatliches + Questrial (+ felt-tip hand accent)
- Orange `#FF8833` accent · warm lumber browns · dark hero bands
- Square filter chips (never pill)
- Motion: press scale, tab indicator, skeleton crossfade — 60–120 FPS

## Run locally

```bash
# Shared packages
npm run build:packages

# Infra (optional — API degrades gracefully without Redis/S3)
docker compose -f docker-compose.platform.yml up -d

# API (Postgres required for full CRUD; health works without)
cp apps/api/.env.example apps/api/.env
npm run prisma:generate -w @buildiq/api
npm run prisma:push -w @buildiq/api   # or prisma:migrate
npm run prisma:seed -w @buildiq/api
npm run dev:api                       # http://localhost:4000

# Web dashboard
npm run dev:web                       # http://localhost:3001

# Mobile
npm run dev:mobile                    # Expo
```

Demo credentials (API seed): `demo@buildiq.app` / `demo1234`  
Mobile/web also render from mock data when the API is unreachable.

## Ports

| Service | Port |
|---|---|
| Legacy soft-launch Next | 3000 |
| Platform web dashboard | 3001 |
| NestJS API | 4000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO (S3) | 9000 |

## Completeness checklist (discussed scope)

| Requirement | Status |
|---|---|
| Exact Millwork Studio design system + screen specs | Done — `docs/design/` |
| Shared packages: tokens, types, validation, permissions, pricing | Done — tested |
| Expo mobile (strict TS, new architecture) | Done — `apps/mobile` |
| Custom UI kit + Sheet (swipe dismiss) | Done — `src/ui/*` |
| Screens M0–M9 (Track dedicated) | Done |
| Skeletons, optimistic jobs/cart, dark mode, tablet layouts | Done |
| Gestures: stack back, long-press Sheet, swipe Sheet | Done |
| Motions: press scale, tab indicator, enter/skeleton | Done |
| a11y labels / roles | Done on kit + tabs + Track |
| Next.js web dashboard W1–W8 | Done — `apps/web` |
| NestJS API + Prisma Postgres + Redis + S3 stubs | Done — `apps/api` |
| Auth, projects, proposals, shop/cart, orders, cabinetry, health | Done |
| Per-project materials library (lumber → stone categories) | Done — mobile + web + `GET/POST /projects/:id/materials` |
| Blueprints / orchestrate / estimate endpoints | Done (orchestrate stub honest) |
| docker-compose Postgres/Redis/MinIO | Done |
| Soft-launch root Next preserved | Done |

**Still intentional stubs (called out in SCREENS “out of scope”):** live Stripe, full AI vision pipeline, native store binaries, email delivery for proposal send, multipart blueprint bytes.

## Cutover notes

1. Keep shipping soft-launch features on root Next until Nest API parity covers auth, projects, proposals, shop, orders.
2. Point Expo + `apps/web` at Nest (`EXPO_PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL`).
3. Migrate SQLite → PostgreSQL with a one-time export when ready for production tenants.
4. Do not activate live Stripe without keys; keep mock checkout until then.
