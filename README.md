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

## App Store & Play Store

See **[store/STORE_COMPLIANCE.md](store/STORE_COMPLIANCE.md)** for Apple/Google submission checklists, privacy nutrition labels, Data Safety answers, and Capacitor packaging notes.

In-app: Privacy `/privacy` · Terms `/terms` · Support `/support` · Account deletion `/settings/account`

## AI bots

After a builder uploads plans, the AI crew runs automatically:

1. **Plan Reader** — classifies sheets  
2. **Takeoff Bot** — materials & quantities  
3. **Estimate Bot** — full cost rollup  
4. **Bid Bot** — trade bid packages  
5. **Package Bot** — loads Shop cart (windows, doors, lumber, etc.)  
6. **Spruce Bot** — pricing sync + quote  
7. **Briefing Bot** — next-step summary  

Progress streams live in the app. Builders can also tap **Run AI bots** anytime.

## Material package shop

Builders can order takeoff packages from **Shop**:

Windows · Doors · Lumber · Trusses · Cabinetry · Masonry Stone · Door Hardware · Millwork

Flow: add to **Cart** → checkout with **Apple Pay**, **Google Pay**, or card (Stripe when keys are set; otherwise demo wallets) → **Track** sequence:

Order received → Payment confirmed → Takeoff review → Procurement → Fabrication/staging → Shipped → Delivered

For live Apple Pay, verify your domain in the [Stripe Apple Pay settings](https://dashboard.stripe.com/settings/payments/apple_pay). Google Pay works automatically with Stripe in supported Chrome / Android browsers.

## For your builders

1. Send them to **Builder signup** (`/signup`)
2. They create a **company workspace** (name, email, password)
3. Onboarding walks them into their first job
4. Owners invite estimators from **Team** (invite link)
5. Everyone installs the app to their home screen

Each company only sees its own jobs, team, and Spruce settings.

## Mobile app

BuildIQ is an **installable web app (PWA)** with a phone-first shell (bottom tabs, home-screen install).

- **iPhone:** Safari → Share → Add to Home Screen  
- **Android:** Chrome → Install app / Add to Home screen  
- **Native wrappers:** `capacitor.config.json` is included for iOS/Android packaging against a hosted BuildIQ URL.

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
