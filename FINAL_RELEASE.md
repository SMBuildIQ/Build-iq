# BuildIQ 1.0 Soft Release

**Product:** BuildIQ by Supply Monkey Lumber & Materials Co  
**Release:** `1.0.0` soft launch (web + PWA)  
**Date:** 2026-08-04  
**Branch:** `cursor/finalize-app-dc6e`

## Verdict

**Soft-launch ready** for web/PWA demo and staging deploy.  
**Not** hard-launched: no public production deploy, no live Stripe, no App Store/Play, no counsel-final legal, no Expo binaries, no cabinetry schema (audit approved only).

## Shipped in 1.0

| Area | Included |
|---|---|
| Auth | Signup, login, logout, reset, verify, lockout, account delete/export |
| Tenancy | Companies, memberships, RBAC |
| Jobs | Projects, blueprints, OCR, optional GPT-4o vision, measuring tools |
| AI | Agent orchestration (`AgentRun`/`AgentStep`), estimating workflow SSE |
| Estimating | Takeoff, cost rollup, bids, Excel + PDF subtotal export |
| Commerce | Shop, cart, checkout (Stripe or mock), order tracking |
| Brand | Supply Monkey styling, IQ logo, draft Privacy/Terms/Support |
| Ops | `/api/health`, smoke script, CI workflow, launch checklist |

## Explicitly out of scope (honest)

- Cabinetry proposals module (see `CABINETRY_INTEGRATION_AUDIT.md` — PLANNED)
- Customers/CRM, portal, RFIs, punch, scheduling, etc. (`/modules`)
- Expo native app / store submission
- Postgres + RLS production cutover
- Live Spruce SOAP / live payments without owner approval
- Attorney-final legal policies

## Verify

```bash
npm run db:push
npm run db:seed
npm run launch:check
npm run build && npm start
npm run smoke
curl -s http://127.0.0.1:3000/api/health
```

Demo: `demo@buildiq.app` / `demo1234`  
Support: `support@supplymonkeyco.com`

## Owner gates before hard launch

1. Approve HTTPS production deploy + secrets  
2. Stripe live keys (or keep mock for demo only)  
3. Resend for transactional email  
4. Attorney sign-off → `LEGAL_POLICIES_FINAL=true`  
5. Approve cabinetry Phase 1 if desired  
6. Approve Expo / store path if desired  

**Do not deploy publicly or charge live cards without explicit owner approval.**
