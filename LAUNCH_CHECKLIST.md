# Launch checklist — BuildIQ by Supply Monkey

**Release:** Soft launch **1.0.0** (web + PWA) — see `FINAL_RELEASE.md`  
**Product scope:** jobs, plans (OCR/vision/measuring), AI agent orchestration, estimates, bids, Excel/PDF, shop/cart/tracking, team, account.  
**Not in this launch:** Expo native binaries, App Store / Play submission, cabinetry proposals (planned), unfinished construction modules (CRM, RFIs, etc.), counsel-final legal policies, live payments without approval.

---

## Go / no-go

| Gate | Status | Owner |
|---|---|---|
| Production build passes | ✅ `npm run launch:check` | Eng |
| Unit tests pass | ✅ | Eng |
| Smoke script (`npm run smoke`) | ✅ against running server | Eng |
| Health endpoint `/api/health` | ✅ includes AI/orchestration flags | Eng |
| Demo account seeded | ✅ `demo@buildiq.app` / `demo1234` | Eng |
| Supply Monkey branding + IQ logo | ✅ | Eng |
| Legal entity / support contacts | ✅ | Eng |
| Privacy/Terms marked **Draft** (attorney review) | ✅ — **do not claim final** | Legal |
| AI Agent Orchestration | ✅ `/agents` + persisted runs | Eng |
| Plan OCR + measuring + PDF export | ✅ | Eng |
| Stripe live keys for real charges | ⬜ set before hard launch | Ops |
| `RESEND_API_KEY` for password reset / verify mail | ⬜ set before hard launch | Ops |
| `AUTH_SECRET` 32+ in production | ⬜ required | Ops |
| HTTPS production host | ⬜ required | Ops |
| `LEGAL_POLICIES_FINAL=true` after counsel | ⬜ blocked on attorney | Legal |
| Cabinetry Phase 1 schema | ⬜ blocked on audit approval | Owner |
| App Store / Play submit | ⬜ blocked — Cap/Expo + your approval | Owner |
| Public marketing deploy | ⬜ needs your approval | Owner |

---

## Soft launch (web/PWA) — ready when you approve deploy

1. Deploy to HTTPS with:
   - `AUTH_SECRET` (32+)
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL=https://your-domain`
   - Legal env vars (already defaulted to Supply Monkey)
   - Optional: `OPENAI_API_KEY` for GPT-4o vision takeoff
   - Optional: `ALLOW_MOCK_PAYMENTS=true` **only** if Stripe not ready (dev/demo)
2. Set Stripe keys when ready for real material payments.
3. Set `RESEND_API_KEY` + `EMAIL_FROM` for reset/verify/deletion emails.
4. Run smoke: `npm run smoke https://your-domain`
5. Install as PWA on a phone; walk demo job → upload → Run AI agents → shop.
6. Keep Privacy/Terms as Draft until counsel signs off.

```bash
export AUTH_SECRET="$(openssl rand -hex 32)"
export NEXT_PUBLIC_APP_URL="https://your-domain"
docker compose up --build
# or: npm run build && npm start
```

---

## Hard launch (stores)

Blocked until:

1. Attorney approves Privacy + Terms → `LEGAL_POLICIES_FINAL=true`
2. You approve store submission
3. Native projects (Capacitor or Expo) on Mac/Windows with Xcode/Android Studio
4. TestFlight + Play internal testing complete (`IOS_RELEASE_CHECKLIST.md`, `ANDROID_RELEASE_CHECKLIST.md`)
5. Live Stripe + Apple Pay domain verification

See `store/CONTACT.md` and `store/STORE_COMPLIANCE.md`.

---

## What “complete” means for this release

| Included | Honest out-of-scope |
|---|---|
| Auth (signup, login, reset, verify, lockout, delete) | Native Expo app |
| Multi-tenant companies + RBAC | CRM / RFIs / punch / scheduling |
| Projects, OCR/vision, measuring, orchestration, estimates, bids, Excel/PDF | DWG native CAD parse |
| Shop, cart, checkout, tracking | Live Spruce SOAP (mock default) |
| PWA install | Store binary submission |
| Draft legal + support contacts | Final counsel-approved policies |
| Cabinetry hub (planned empty state) | Cabinetry schema / proposals / deposits |

Planned modules remain labeled **Planned** in `/modules` and `/cabinetry` — not fake features.

---

## Verify before you announce

```bash
npm run launch:check
npm run dev   # or production start
npm run smoke
curl -s https://your-domain/api/health
```

Demo: `demo@buildiq.app` / `demo1234`  
Support: support@supplymonkeyco.com
