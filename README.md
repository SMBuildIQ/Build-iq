# BuildIQ

Residential construction estimating platform: blueprint upload, AI material takeoff, cost estimates, subcontractor bid packages, Excel export, and ECI Spruce sync.

## Features

- **Accounts** — register / login with session cookies
- **Projects** — residential job metadata (sf, stories, address)
- **Blueprint upload** — PDF/images with sheet-type inference
- **AI takeoff** — OpenAI when `OPENAI_API_KEY` is set; otherwise a deterministic local estimator
- **Cost estimate** — materials, waste, labor, contingency, overhead, profit, tax
- **Bid packages** — one package per trade
- **Excel export** — summary, takeoff, per-trade bids, Spruce SKU sheet
- **ECI Spruce** — mock inventory/pricing/quotes by default; live SOAP stubs when credentials are configured

## Quick start

```bash
npm install
cp .env.example .env   # or use the included .env
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo login:** `demo@buildiq.app` / `demo1234`

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path (`file:./dev.db`) |
| `AUTH_SECRET` | JWT signing secret |
| `OPENAI_API_KEY` | Optional; enables GPT takeoff |
| Spruce settings | Configured in-app under **ECI Spruce** |

## Docker

```bash
docker compose up --build
```

App listens on port 3000. Persist DB/uploads via named volumes.

## ECI Spruce

Spruce exposes a SOAP ecommerce API (inventory, pricing, quotes) provisioned by ECI. In BuildIQ:

1. Open **ECI Spruce** in the app
2. Enter API/SOAP endpoints, API key, branch, and account from your ECI specialist
3. Disable mock mode for live calls
4. From a project: **Sync Spruce pricing** or **Send to Spruce**

Without credentials, mock mode returns catalog-backed inventory and quote numbers so the full workflow is testable.

## Stack

Next.js · TypeScript · Prisma · SQLite · ExcelJS · jose · Tailwind CSS
