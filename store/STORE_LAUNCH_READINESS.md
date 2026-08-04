# Store launch readiness — Apple App Store & Google Play

**Canonical app id:** `com.supplymonkey.buildiq` (Expo + Capacitor)  
**Version:** `1.0.0`  
**Operator:** Supply Monkey Lumber & Materials Co · Prescott, AZ  
**Support:** support@supplymonkeyco.com

This matrix tracks what the binary must satisfy for review. Items marked **PASS in code** are implemented in-repo. Items marked **OWNER / OPS** still require production host, counsel, or store-console actions before submit.

## Apple App Store Review Guidelines

| Criterion | Status | Evidence |
|---|---|---|
| 5.1.1 Privacy Policy URL in metadata + in-app | PASS in code / OWNER host | Login + More link to `/privacy`; set `EXPO_PUBLIC_LEGAL_BASE_URL` |
| 5.1.1(v) Account deletion in-app | PASS in code | More → Delete account → `DELETE /auth/account`; web `/settings/account` |
| Support URL | PASS in code / OWNER host | More → Support; `store/CONTACT.md` |
| No Sign in with Apple required | PASS | Email/password only (no Google/Facebook) |
| Physical goods payments (not IAP) | PASS in code | Stripe card checkout; wallet copy deferred until Apple Pay domain live |
| Export compliance (HTTPS only) | PASS in code | `ITSAppUsesNonExemptEncryption: false` in `app.json` |
| Privacy nutrition labels / PrivacyInfo | PASS drafts | `PrivacyInfo.xcprivacy`, `store/ios/*`, Expo `privacyManifests` |
| Permission purpose strings | PASS in code | Document/photo picker strings only; no camera/mic/location |
| Age rating / not for kids | PASS drafts | `store/content-rating.md`, `store/android/audience.md` (18+) |
| No placeholder / dead review-path buttons | PASS in code | Demo gated; forgot-password mailto; Export explains path; fake wallet CTA removed |
| Demo credentials | PASS in code | Not in shipping UI; put `demo@buildiq.app` / `demo1234` in **Review Notes only**; `EXPO_PUBLIC_ALLOW_DEMO=false` on production EAS |
| Accessibility basics | PARTIAL | Labels/roles on kit + primary flows; do not claim WCAG AA yet |
| Crash-free primary path | OWNER | EAS TestFlight validation required |

## Google Play policies

| Criterion | Status | Evidence |
|---|---|---|
| Privacy Policy | PASS in code / OWNER host | Same URLs as Apple |
| Data Safety form | PASS drafts | `store/android/data-safety.md` + `PRIVACY_DATA_MAP.md` |
| Target audience 18+ / not for children | PASS drafts | `store/android/audience.md` |
| Account deletion | PASS in code | Same delete path + web URL |
| Physical goods (not Play Billing) | PASS | Stripe for materials |
| Minimal permissions | PASS in code | INTERNET + NETWORK_STATE; broad media/camera/location blocked |
| Target API level | OWNER | Set when generating native project / EAS (must meet current Play requirement) |
| Internal testing track | OWNER | EAS `preview` → Play internal |

## Production submit blockers (cannot be code-only)

1. Attorney-final Privacy & Terms → set `LEGAL_POLICIES_FINAL=true` (drafts are labeled today).
2. Live HTTPS host for app + API (`app.buildiq.com` / `api.buildiq.com` or your domains).
3. EAS project id + App Store Connect / Play Console app records.
4. Owner approval to submit (`OWNER_APPROVALS.md`).
5. TestFlight / Play internal build with account deletion tested end-to-end.
6. Stripe live keys + Apple Pay domain association (if enabling wallets).

## Review notes template

> BuildIQ is a B2B construction estimating and materials ordering app operated by  
> Supply Monkey Lumber & Materials Co (710 N Montezuma St, Prescott, Arizona 86302).  
> Demo: demo@buildiq.app / demo1234  
> Account deletion: More → Delete account (or Settings → Account on web).  
> Privacy / Terms / Support: https://\<production-host\>/{privacy,terms,support}  
> Payments charge for physical lumber/materials (Stripe), not digital IAP.

## How to build store binaries

```bash
cd apps/mobile
# Preview / review (demo allowed)
EXPO_PUBLIC_API_URL=https://api.example.com \
EXPO_PUBLIC_LEGAL_BASE_URL=https://app.example.com \
EXPO_PUBLIC_ALLOW_DEMO=true \
npx eas build --profile preview --platform all

# Production (demo OFF)
EXPO_PUBLIC_ALLOW_DEMO=false \
npx eas build --profile production --platform all
```
