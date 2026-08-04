# Security

## Controls in place

- HTTPS required in production (HSTS header)
- bcrypt password hashing (cost 12)
- HTTP-only session cookies + JWT with DB hydration and `tokenVersion` revoke
- Logout bumps token version
- Login lockout after repeated failures (DB-backed)
- Rate limits on auth, checkout, account delete
- Zod validation on API inputs
- Upload allow-list + magic-byte sniff + size cap
- Company tenant scoping + RBAC (`requirePermission`)
- Fail-closed payments in production without Stripe (unless `ALLOW_MOCK_PAYMENTS=true`)
- Audit log table for significant auth/order actions
- Security headers (CSP, frame denial, nosniff, referrer)
- Boot-time `AUTH_SECRET` enforcement via `instrumentation.ts`

## Threat model (summary)

| Asset | Threat | Mitigation |
|---|---|---|
| Auth | Credential stuffing | Rate limit + lockout + bcrypt |
| Sessions | Stolen JWT | tokenVersion, short-ish 30d, logout revoke |
| Tenants | Cross-company access | companyId on queries + membership check |
| Files | Malicious upload | MIME/ext/magic + UUID names; signed URLs planned |
| Payments | Fake success | Production refuses mock without explicit allow |
| AI | Prompt injection | Treat outputs as drafts; limit user text in prompts |

## Incident process (draft)

1. Revoke sessions (bump tokenVersion / rotate AUTH_SECRET)
2. Rotate Stripe / OpenAI / Spruce credentials
3. Preserve audit logs
4. Notify affected companies per privacy policy
5. Patch and deploy

## Remaining gaps (tracked)

- Redis-backed rate limits for multi-instance
- Object storage + malware scanning
- MFA / biometric (mobile)
- CSRF tokens beyond SameSite=lax
- Soft-delete workflows for all entities
