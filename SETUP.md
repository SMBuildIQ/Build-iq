# Setup

## Prerequisites

- Node.js 22+
- npm 10+

## Local development

```bash
cp .env.example .env
# Set AUTH_SECRET to 32+ characters
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000

Demo (seed only / App Review notes): `demo@buildiq.app` / `demo1234`

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync Prisma schema (dev) |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:seed` | Seed packages + demo company |

## Environment

See `.env.example`. Critical:

- `AUTH_SECRET` — required 32+ chars in production
- Stripe keys — required for live checkout; mock only when not production or `ALLOW_MOCK_PAYMENTS=true`
- `RESEND_API_KEY` — optional; without it, emails log to console in development

## Docker

```bash
export AUTH_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

## Store / Capacitor

Native projects are not generated in this repo yet. After deploying HTTPS:

```bash
# On a machine with Xcode / Android Studio
npm run cap:add:ios
npm run cap:add:android
# Set capacitor.config.json server.url to production
npx cap sync
```
