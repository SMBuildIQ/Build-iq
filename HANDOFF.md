# BuildIQ — developer handoff

**Branch:** `cursor/store-compliance-launch-dc6e`  
**Latest commit:** see `git log -1` inside the archive  
**Product:** BuildIQ for Supply Monkey Lumber & Materials Co (Prescott, AZ)

## What’s in this package

Monorepo with:

| Path | What |
|---|---|
| `apps/mobile` | Expo Router mobile app (store-compliance ready, v1.0.0) |
| `apps/web` | Next.js dashboard (:3001) |
| `apps/api` | NestJS API + Prisma Postgres (:4000) |
| `packages/*` | Shared types, pricing, permissions, validation, design tokens |
| Soft-launch Next at repo root | Legacy PWA (:3000) |
| `store/` | Apple / Google store questionnaires + launch readiness |
| `public/mobile-shots/` | Screenshot gallery |

## Demo login

- Email: `demo@buildiq.app`
- Password: `demo1234`

## Run locally

```bash
npm install
npm run build:packages

# Infra (Docker)
docker compose -f docker-compose.platform.yml up -d

# API DB
cp apps/api/.env.example apps/api/.env   # if needed
npm run prisma:generate -w @buildiq/api
npm run prisma:push -w @buildiq/api
npm run prisma:seed -w @buildiq/api

npm run dev:api      # http://localhost:4000
npm run dev:web      # http://localhost:3001
npm run dev:mobile   # Expo
```

Soft-launch web: `npm run dev` at repo root → http://localhost:3000

## Read first

1. `PLATFORM.md` — monorepo layout  
2. `store/STORE_LAUNCH_READINESS.md` — App Store / Play checklist  
3. `IOS_RELEASE_CHECKLIST.md` / `ANDROID_RELEASE_CHECKLIST.md`  
4. `FINAL_RELEASE.md` / `LAUNCH_CHECKLIST.md` — soft-launch status  

## Notes for your dev

- No GitHub remote was configured in the cloud agent workspace — this zip is the handoff artifact.
- Production store submit still needs: live HTTPS host, counsel-final Privacy/Terms, EAS project id, owner approval.
- Bundle / app id: `com.supplymonkey.buildiq`
- Materials library is per-project (lumber, trusses, I-joists, windows, doors, cabinetry, hardware, masonry, millwork).
