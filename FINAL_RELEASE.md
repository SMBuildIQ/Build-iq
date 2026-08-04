# BuildIQ 1.0 Soft Release

**Product:** BuildIQ by Supply Monkey Lumber & Materials Co  
**Release:** `1.0.0` soft launch (web + PWA)  
**Owner approval:** 2026-08-04 — see `OWNER_APPROVALS.md`  
**Public demo URL:** https://wicked-words-care.loca.lt  

## Verdict

**Owner-approved soft launch.** App is on a public HTTPS tunnel for demo.  
Cabinetry Phase 1 foundations started. Live Stripe and store binaries still need keys / Cap projects.

## Shipped in 1.0 (+ Phase 1 cabinetry start)

| Area | Included |
|---|---|
| Auth | Signup, login, logout, reset, verify, lockout, account delete/export |
| Tenancy | Companies, memberships, RBAC |
| Jobs | Projects, blueprints, OCR, optional GPT-4o vision, measuring tools |
| AI | Agent orchestration (`AgentRun`/`AgentStep`), estimating workflow SSE |
| Estimating | Takeoff, cost rollup, bids, Excel + PDF subtotal export |
| Proposals | Multi-category customer proposals (Windows–Millwork), PDF, send, public accept |
| Commerce | Shop, cart, checkout (mock until Stripe keys), order tracking |
| Cabinetry Phase 1 start | Customers, Mesa/Summit/Pinnacle product lines, opportunities |
| Brand | Supply Monkey styling, IQ logo, draft Privacy/Terms/Support |
| Ops | `/api/health`, smoke script, CI workflow, launch checklist |

## Still blocked / pending

| Item | Status |
|---|---|
| Live Stripe | Approved in principle — **set Stripe keys** to go live |
| Store submit | Approved in principle — needs Cap/Expo native projects |
| Counsel-final legal | Still Draft |
| Cabinetry AI extract / catalog pricing / deposits | Later Phase 1 steps (customer package proposals ship via Proposals) |

## Demo

- URL: https://wicked-words-care.loca.lt (localtunnel; may show a click-through interstitial)
- Local: http://127.0.0.1:3000  
- Login: `demo@buildiq.app` / `demo1234`  
- Support: support@supplymonkeyco.com
