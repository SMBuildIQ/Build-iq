# BuildIQ — App Store & Google Play Compliance Guide

This document maps BuildIQ to Apple App Store Review Guidelines and Google Play policies for a construction estimating / materials commerce app.

## Distribution model

BuildIQ ships as:

1. **Progressive Web App (PWA)** — installable today  
2. **Capacitor native shell** (`capacitor.config.json`) — loads the hosted HTTPS app (`server.url`) with a minimal `native-shell/` placeholder `webDir`

Native shells should point `server.url` at your production HTTPS origin (default placeholder: `https://app.buildiq.com`).

## Apple App Store checklist

| Requirement | BuildIQ implementation |
|---|---|
| Privacy Policy URL | `/privacy` (must be publicly reachable) |
| Account deletion in-app | Settings → Account → Delete account (`DELETE /api/account/delete`) — purges DB + upload files; invalidates JWTs |
| Support URL | `/support` |
| Terms of Use | `/terms` |
| Sign in with Apple | Optional follow-up if you add third-party social login; email/password only today |
| No forced ratings | No review prompts shipped |
| Physical goods payments | Stripe / Apple Pay — physical materials (not digital IAP) |
| ATS / HTTPS | Production requires HTTPS; Capacitor schemes = https; no ATS exceptions |
| Export compliance | See `store/ios/export-compliance.md` (`ITSAppUsesNonExemptEncryption` = false) |
| Accessibility zoom | Viewport does **not** lock `maximum-scale` |
| Permission strings | See `store/ios/InfoPlist.md` — only declare what you use |
| Privacy Nutrition Labels | See `store/ios/privacy-nutrition-labels.json` (aligned with PrivacyInfo — no Analytics purpose) |
| Content rating | See `store/content-rating.md` |
| Kids category | Not for children; business tool |

### Apple Pay

1. Enable Apple Pay in Stripe Dashboard  
2. Host `apple-developer-merchantid-domain-association` on your domain  
3. Verify domain in Stripe Apple Pay settings  

## Google Play checklist

| Requirement | BuildIQ implementation |
|---|---|
| Privacy Policy | `/privacy` |
| Data safety form | Mirror fields in `store/android/data-safety.md` |
| Target audience | `store/android/audience.md` — 18+, not for children |
| Account deletion | Same in-app deletion path + web URL |
| Payments for physical goods | Google Pay via Stripe Payment Request (not Play Billing for physical goods) |
| Target API level | Set when generating Android project via Capacitor (use current Play requirement) |
| Foreground services | None required for core estimating flows |
| Permissions | Minimal — see `store/android/permissions.md` (no READ_MEDIA_*) |

## Security & quality (production coding)

- HTTP-only session cookies + JWT (`jose`) with **DB-backed session hydration** and `tokenVersion` revoke  
- bcrypt password hashing (cost 12)  
- Zod validation on API inputs; Terms acceptance required server-side  
- Auth / checkout / account-delete rate limiting middleware  
- Security headers (CSP, HSTS, frame denial, nosniff)  
- Upload allow-list + magic-byte sniff + 25MB cap; files purged on account delete  
- Production `AUTH_SECRET` enforcement (32+ chars; required in Docker Compose)  
- Error boundary + skip-to-content a11y; public pages expose `id="main-content"`  
- Company-scoped authorization on all job/order APIs  
- Data export endpoint for portability  
- `robots.txt` + sitemap for Privacy / Terms / Support discoverability  

## Before you submit

1. Deploy to HTTPS with real `AUTH_SECRET`, Stripe keys, and privacy/terms/support URLs  
2. Confirm store contacts in **[store/CONTACT.md](./CONTACT.md)** (Supply Monkey Lumber & Materials Co)  
3. Have counsel approve Privacy/Terms, then set `LEGAL_POLICIES_FINAL=true` (drafts are not final published policies)  
4. `npx cap add ios && npx cap add android` from a machine with Xcode / Android Studio  
5. Confirm `server.url` matches production; sync PrivacyInfo.xcprivacy into the iOS project  
6. Fill App Store Connect / Play Console questionnaires using the `store/` files  
7. Test account deletion end-to-end on a TestFlight / internal testing build  
8. Provide demo login credentials **only** in App Review notes (not in the shipping UI): `demo@buildiq.app` / `demo1234`  

## Review notes template

> BuildIQ is a B2B construction estimating app operated by Supply Monkey Lumber & Materials Co  
> (710 N Montezuma St, Prescott, Arizona 86302, United States).  
> Support: support@supplymonkeyco.com  
> Create an account or use demo@buildiq.app / demo1234.  
> Upload a PDF plan on a job → AI bots run automatically.  
> Account deletion: Account tab → Delete account (type DELETE). Owners with teammates must transfer ownership first.  
> Or email support@supplymonkeyco.com with subject “Account deletion request”.  
> Payments purchase physical building material packages via Stripe (Apple Pay / Google Pay).  
> Privacy Policy and Terms shown in-app are drafts pending attorney review unless LEGAL_POLICIES_FINAL is enabled.  

## Legal disclaimer

Privacy Policy and Terms of Service in this repository are **drafts for attorney review**. They are not legal advice and must not be treated as final published policies until counsel approves them.
