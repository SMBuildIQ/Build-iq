# Launch checklist — BuildIQ by Supply Monkey

**Product scope for this launch:** web + PWA estimating app (jobs, plans, AI bots, estimates, bids, shop/cart, tracking, team, account).  
**Not in this launch:** Expo native binaries, App Store / Play submission, unfinished construction modules (CRM, RFIs, etc.), counsel-final legal policies.

---

## Go / no-go

| Gate | Status | Owner |
|---|---|---|
| Production build passes | ✅ `npm run launch:check` | Eng |
| Unit tests pass | ✅ | Eng |
| Smoke script (`npm run smoke`) | ✅ against running server | Eng |
| Health endpoint `/api/health` | ✅ | Eng |
| Demo account seeded | ✅ `demo@buildiq.app` / `demo1234` | Eng |
| Supply Monkey branding + IQ logo | ✅ | Eng |
| Legal entity / support contacts | ✅ | Eng |
| Privacy/Terms marked **Draft** (attorney review) | ✅ — **do not claim final** | Legal |
| Stripe live keys for real charges | ⬜ set before hard launch | Ops |
| `RESEND_API_KEY` for password reset / verify mail | ⬜ set before hard launch | Ops |
| `AUTH_SECRET` 32+ in production | ⬜ required | Ops |
| HTTPS production host | ⬜ required | Ops |
| `LEGAL_POLICIES_FINAL=true` after counsel | ⬜ blocked on attorney | Legal |
| App Store / Play submit | ⬜ blocked — needs Cap projects + your approval | Owner |
| Public marketing deploy | ⬜ needs your approval | Owner |

---

## Soft launch (web/PWA) — recommended next step

1. Deploy to HTTPS with:
   - `AUTH_SECRET` (32+)
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL=https://your-domain`
   - Legal env vars (already defaulted to Supply Monkey)
   - Optional: `ALLOW_MOCK_PAYMENTS=true` **only** if Stripe not ready (dev/demo)
2. Set Stripe keys when ready for real material payments.
3. Set `RESEND_API_KEY` + `EMAIL_FROM` for reset/verify/deletion emails.
4. Run smoke: `npm run smoke https://your-domain`
5. Install as PWA on a phone; walk demo job → upload → bots → shop.
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
3. `npx cap add ios/android` on a Mac/Windows with Xcode/Android Studio
4. TestFlight + Play internal testing complete (`IOS_RELEASE_CHECKLIST.md`, `ANDROID_RELEASE_CHECKLIST.md`)
5. Live Stripe + Apple Pay domain verification

See `store/CONTACT.md` and `store/STORE_COMPLIANCE.md`.

---

## What “complete” means for this release

| Included | Honest out-of-scope |
|---|---|
| Auth (signup, login, reset, verify, lockout, delete) | Native Expo app |
| Multi-tenant companies + RBAC | CRM / RFIs / punch / scheduling |
| Projects, blueprints, OCR/vision, measuring, estimates, bids, Excel/PDF | DWG native CAD parse |
| Shop, cart, checkout, tracking | Live Spruce SOAP (mock default) |
| PWA install | Store binary submission |
| Draft legal + support contacts | Final counsel-approved policies |

Planned modules remain labeled **Planned** in `/modules` — not fake features.

---

## Verify before you announce

```bash
npm run launch:check
npm run dev   # or production start
npm run smoke
curl -s https://your-domain/api/health
```

Demo review notes: `demo@buildiq.app` / `demo1234`  
Support: support@supplymonkeyco.com
