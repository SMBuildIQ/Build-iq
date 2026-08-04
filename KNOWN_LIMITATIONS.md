# Known limitations (honest inventory)

This document lists broken, placeholder, mock, and incomplete behavior. Do **not** claim these are production-complete.

## Broken / high-risk if shipped as-is

1. **Mock payments succeed when Stripe keys are missing** (`src/lib/commerce/payments.ts`, checkout defaults to `mock_card`). A misconfigured production deploy can “charge” without money moving.
2. **Capacitor claims store packaging but `ios/` and `android/` projects do not exist.** Only `capacitor.config.json` + `native-shell/index.html`.
3. **Prisma migrations are stale** vs current schema; Docker uses `prisma db push`. Unsafe for production schema evolution.
4. **VIEWER role is not mutation-restricted** on most APIs — company-scoped only, not permission-scoped.
5. **Service worker precaches `/dashboard`** and caches authenticated HTML (`public/sw.js`) — stale private UI risk on shared devices.
6. **Logout does not bump `tokenVersion`** — stolen JWT remains valid until expiry.

## Placeholder / incomplete product surfaces

| Item | Location |
|---|---|
| Legal entity / address placeholders | `src/app/privacy/page.tsx`, `src/app/terms/page.tsx` (`[Your State]`) |
| Support emails unverified | `support@`, `privacy@`, `legal@buildiq.app` |
| Hardcoded Capacitor URL | `https://app.buildiq.com` in `capacitor.config.json` |
| Unused Capacitor plugins | Dependencies installed; zero imports under `src/` |
| Unused `@ducanh2912/next-pwa` | In package.json; not wired |
| `assertProductionSecrets()` | Defined, never called |
| Live Spruce SOAP | Connectivity attempt then falls back to catalog prices |
| AI takeoff | Not vision/OCR of drawings — metadata + heuristics |
| Order tracking advance | Any authenticated member can advance steps |

## Mock data / demo

| Item | Detail |
|---|---|
| Seed demo user | `demo@buildiq.app` / `demo1234` (`prisma/seed.ts`) — for review notes / local only |
| Mock Apple/Google Pay | Explicit mock wallet types when Stripe unavailable |
| Mock Spruce | Default `mockMode: true` on company create |
| Material catalog | Seeded packages in DB |

## Hard-coded credentials / secrets

| Item | Risk |
|---|---|
| Demo password in seed/README | Acceptable for seed; must not appear in shipping UI (removed from login defaults) |
| Dev `AUTH_SECRET` fallback in code | `buildiq-dev-secret-change-me-now` when not production |
| Spruce API keys | Stored plaintext in SQLite |
| `.env` | Gitignored; verify never committed |

## Missing environment variables / config gaps

Referenced but weak/empty by default:

- `AUTH_SECRET` (required 32+ in production)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (empty → mock pay)
- `OPENAI_API_KEY` (empty → local AI)
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL`

Not present (needed for target architecture):

- Email provider (`SMTP_*` / Resend / SES)
- Object storage (`S3_*`)
- Redis / queue URL
- Push credentials (APNs / FCM)
- Staging vs production app configs
- MFA / OAuth client IDs

## Missing auth features (required for production-grade target)

Password reset · email verification · refresh tokens · MFA · biometric unlock · durable lockout · remote session revocation UI · invite email delivery

## Web-only behaviors that fail or degrade on mobile native shells

- Stripe Payment Request / Apple Pay / Google Pay inside WKWebView
- No offline write queue
- No native camera / Keychain / push
- File input only (no Capacitor Camera)
- `Permissions-Policy: camera=()` blocks camera in web

## Incomplete pages / empty modules

See `MODULE_STATUS.md` — 16 of 25 construction modules are **NONE**.

## Dead links

Primary navigation routes resolve. Operational risk: mailto support addresses may bounce until mailboxes exist. Unused `AppNav` component still references marketing anchors but is not the live shell.
