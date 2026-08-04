# Railway deployment

## Important: Expo mobile ≠ Railway

`apps/mobile` is an **Expo / React Native** app. Railway hosts **web services**, not iOS/Android store binaries.

| What you want | Where it goes |
|---|---|
| Soft-launch web app (login, jobs, proposals) | **Railway** ← this repo’s root `Dockerfile` |
| Nest API (`apps/api`) | Separate Railway service (Postgres) — optional later |
| iPhone / Android app | **Expo EAS** (`apps/mobile`) → App Store / Play |

## Deploy soft-launch web on Railway

1. New Railway project → Deploy from GitHub → `SMBuildIQ/Build-iq`
2. Root directory: **`/`** (repo root)
3. Builder: **Dockerfile** (`railway.toml` already sets this)
4. Add variables:

```
AUTH_SECRET=<random-string-at-least-32-chars>
DATABASE_URL=file:./data/prod.db
NEXT_PUBLIC_APP_URL=https://<your-railway-domain>
NODE_ENV=production
```

Prefer Railway **Postgres** plugin and set `DATABASE_URL` to that Postgres URL for production.

5. Generate domain in Railway → Settings → Networking

## Why builds were failing

Root `tsconfig.json` was typechecking the whole monorepo (`apps/web`, `apps/mobile`, `packages/*`). Next’s production build then failed on unrelated Expo/workspace paths. That is fixed: soft-launch only typechecks `src/`.

## Mobile app (Expo)

```bash
cd apps/mobile
npx eas build --profile preview --platform android   # or ios
```

Demo login: `demo@buildiq.app` / `demo1234`
