# KNOWN_LIMITATIONS.md

Honest inventory after the incomplete-items fix pass.

## Fixed in this pass

- Production mock payments fail-closed (unless `ALLOW_MOCK_PAYMENTS=true`)
- Logout bumps `tokenVersion`
- Service worker no longer caches authenticated HTML
- Boot-time `AUTH_SECRET` checks via instrumentation
- Full RBAC with backend `requirePermission` on APIs
- Password reset + email verification flows
- DB-backed login lockout
- Audit log table + order/auth events
- AuthToken / LoginAttempt / ModuleRegistry models
- Planned modules hub with honest empty states (no fake CRUD)
- Privacy/Terms driven by env legal settings
- Permissions matrix + security/setup/API docs

## Still incomplete (not faked)

| Item | Status |
|---|---|
| Capacitor `ios/` / `android/` native projects | Not generated (needs Mac/Android Studio) |
| Postgres + formal migrate history for all envs | Schema ready; still SQLite locally |
| Object storage / signed URLs / malware scan | Planned |
| Redis durable rate limits | In-memory only |
| MFA / biometric / push / offline sync | Planned (Expo phase) |
| Live Spruce SOAP parsing | Still stubby; mock default |
| True plan vision OCR | Still metadata/heuristic takeoff |
| 16 construction modules marked PLANNED | Scaffolded only — see `/modules` |
| Email delivery | Console in dev without `RESEND_API_KEY` |
| Legal entity mailing address | Set `LEGAL_ENTITY_ADDRESS` before store submit |
| CI workflows | Not added yet |
| Expo mobile client | Not started (awaits architecture execution phase) |

## Intentionally not faked

Planned modules show **“Planned — not built yet”**. There are no dead Save buttons that pretend to persist CRM, RFIs, punch lists, etc.
