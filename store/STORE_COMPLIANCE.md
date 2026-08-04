# BuildIQ — App Store & Google Play Compliance Guide

This document maps BuildIQ to Apple App Store Review Guidelines and Google Play policies for a construction estimating / materials commerce app.

## Distribution model

BuildIQ ships as:

1. **Progressive Web App (PWA)** — installable today  
2. **Capacitor native shell** (`capacitor.config.json`) — for App Store / Play Store binaries that load the hosted HTTPS app

Native shells should point `server.url` at your production HTTPS origin (e.g. `https://app.buildiq.com`) once deployed.

## Apple App Store checklist

| Requirement | BuildIQ implementation |
|---|---|
| Privacy Policy URL | `/privacy` (must be publicly reachable) |
| Account deletion in-app | Settings → Account → Delete account (`DELETE /api/account/delete`) |
| Support URL | `/support` |
| Terms of Use | `/terms` |
| Sign in with Apple | Optional follow-up if you add third-party social login; email/password only today |
| No forced ratings | No review prompts shipped |
| Physical goods payments | Stripe / Apple Pay — physical materials (not digital IAP) |
| ATS / HTTPS | Production requires HTTPS; Capacitor `androidScheme`/`iosScheme` = https |
| Accessibility zoom | Viewport does **not** lock `maximum-scale` |
| Permission strings | See `store/ios/InfoPlist.md` — only declare what you use |
| Privacy Nutrition Labels | See `store/ios/privacy-nutrition-labels.json` |
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
| Account deletion | Same in-app deletion path + web URL |
| Payments for physical goods | Google Pay via Stripe Payment Request (not Play Billing for physical goods) |
| Target API level | Set when generating Android project via Capacitor (use current Play requirement) |
| Foreground services | None required for core estimating flows |
| Permissions | Minimal — see `store/android/permissions.md` |

## Security & quality (production coding)

- HTTP-only session cookies + JWT (`jose`)  
- bcrypt password hashing  
- Zod validation on API inputs  
- Auth rate limiting middleware  
- Security headers (CSP, HSTS, frame denial, nosniff)  
- Upload allow-list + 25MB cap  
- Production `AUTH_SECRET` enforcement (32+ chars)  
- Error boundary + skip-to-content a11y  
- Company-scoped authorization on all job/order APIs  
- Data export endpoint for portability  

## Before you submit

1. Deploy to HTTPS with real `AUTH_SECRET`, Stripe keys, and privacy/terms URLs  
2. Replace placeholder support emails if needed  
3. `npx cap add ios && npx cap add android` from a machine with Xcode / Android Studio  
4. Set `server.url` to production  
5. Fill App Store Connect / Play Console questionnaires using the `store/` files  
6. Test account deletion end-to-end on a TestFlight / internal testing build  
7. Provide demo login credentials in App Review notes: `demo@buildiq.app` / `demo1234`  

## Review notes template

> BuildIQ is a B2B construction estimating app. Create an account or use demo@buildiq.app / demo1234.  
> Upload a PDF plan on a job → AI bots run automatically.  
> Account deletion: Account tab → Delete account (type DELETE).  
> Payments purchase physical building material packages via Stripe (Apple Pay / Google Pay).  

## Legal disclaimer

This guide helps engineering readiness. It is not legal advice. Have counsel review Privacy Policy and Terms before store submission.
