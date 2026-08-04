# BuildIQ

Residential construction estimating platform: blueprint upload, AI material takeoff, cost estimates, subcontractor bid packages, Excel export, and ECI Spruce sync.

## Platform audit (read first)

| Doc | Purpose |
|---|---|
| [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) | **Start here for go-live** |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Current vs recommended architecture |
| [MODULE_STATUS.md](./MODULE_STATUS.md) | Full / partial / planned module map |
| [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) | Mocks, placeholders, security gaps |
| [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) | Phased plan with task status |
| [SETUP.md](./SETUP.md) | Run locally |
| [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) | RBAC matrix |
| [SECURITY.md](./SECURITY.md) | Security controls + threat model |
| [PRIVACY_DATA_MAP.md](./PRIVACY_DATA_MAP.md) | Data inventory for store disclosures |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API contract summary |
| [store/STORE_COMPLIANCE.md](./store/STORE_COMPLIANCE.md) | App Store / Play compliance notes |

**Backup branch (frozen):** `cursor/backup-pre-platform-rebuild-dc6e` — original project preserved.

In-app module roadmap: **/modules** (planned modules show honest empty states — no fake CRUD).

### Launch commands

```bash
npm run launch:check   # typecheck + tests + production build
npm run smoke          # hit /api/health + auth + projects (server must be up)
```

## Features

- **Accounts** — register / login with session cookies
- **Projects** — residential job metadata (sf, stories, address)
- **Blueprint upload** — PDF/images with sheet-type inference
- **Plan workspace** — OCR scan, GPT-4o drawing vision, scale/length/area/count measuring tools
- **AI takeoff** — Vision-grounded when scanned + `OPENAI_API_KEY`; OCR dimensions; local/catalog fallback
- **Cost estimate** — materials, waste, labor, contingency, overhead, profit, tax
- **Bid packages** — one package per trade
- **Excel export** — summary, takeoff, per-trade bids, Spruce SKU sheet
- **PDF export** — plan estimate & subtotals (cost rollup, trade subtotals, takeoff lines)
- **ECI Spruce** — mock inventory/pricing/quotes by default; live SOAP stubs when credentials are configured

## App Store & Play Store

See **[store/STORE_COMPLIANCE.md](store/STORE_COMPLIANCE.md)** for Apple/Google submission checklists, privacy nutrition labels, Data Safety answers, and Capacitor packaging notes.

In-app: Privacy `/privacy` · Terms `/terms` · Support `/support` · Account deletion `/settings/account`

## AI Agent Orchestration

BuildIQ runs multi-agent workflows through a persisted orchestrator:

- **Registry** — `src/lib/ai/orchestration/registry.ts` (agents + workflows)
- **Engine** — `src/lib/ai/orchestration/orchestrator.ts` (`AgentRun` / `AgentStep`)
- **UI** — `/agents` (registry + run history); project **Run AI bots** streams via `/api/projects/:id/orchestrate`

Default workflow: `estimating-pipeline` (Plan Reader → Takeoff → Estimate → Bids → Packages → Spruce → Briefing).

Cabinetry agents are registered as **planned** and do not execute until that module ships.

## AI bots

After a builder uploads plans, the orchestrator runs the estimating crew automatically:

1. **Plan Reader** — rasterize sheets, OCR + drawing vision  
2. **Takeoff Bot** — vision-grounded materials & quantities  
3. **Estimate Bot** — full cost rollup  
4. **Bid Bot** — trade bid packages  
5. **Package Bot** — loads Shop cart (windows, doors, lumber, etc.)  
6. **Spruce Bot** — pricing sync + quote  
7. **Briefing Bot** — next-step summary  

Open any sheet → **Open plan tools** for scale calibration, length, area, and count measuring.

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

**Demo login (local seed / App Review notes only — not shown in the shipping UI):** `demo@buildiq.app` / `demo1234`

## Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite path (`file:./dev.db`) |
| `AUTH_SECRET` | JWT signing secret |
| `OPENAI_API_KEY` | Optional; enables GPT takeoff |
| Spruce settings | Configured in-app under **ECI Spruce** |

## Docker

```bash
export AUTH_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

App listens on port 3000. `AUTH_SECRET` (32+ chars) is required. Persist DB/uploads via named volumes.

## ECI Spruce

Spruce exposes a SOAP ecommerce API (inventory, pricing, quotes) provisioned by ECI. In BuildIQ:

1. Open **ECI Spruce** in the app
2. Enter API/SOAP endpoints, API key, branch, and account from your ECI specialist
3. Disable mock mode for live calls
4. From a project: **Sync Spruce pricing** or **Send to Spruce**

Without credentials, mock mode returns catalog-backed inventory and quote numbers so the full workflow is testable.

## Stack

Next.js · TypeScript · Prisma · SQLite · ExcelJS · jose · Tailwind CSS
