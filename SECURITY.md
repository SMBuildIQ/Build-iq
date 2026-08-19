# Security

## Tenant isolation

Every tenant-scoped table carries `organizationId`. Every route handler resolves the caller's organization from
the session (`getAuthContext()`), never from client input, and every query filters by it. Single-record loads use
`findFirst({ where: { id, organizationId } })` so a cross-tenant id 404s rather than confirming existence.
Automated tests: `tests/tenant-isolation.test.ts`.

## Authentication

- Passwords: bcrypt, cost factor 12.
- Sessions: HS256 JWT in an `httpOnly`, `sameSite=lax`, `secure` (in production) cookie; 30-day expiry;
  `User.tokenVersion` allows revoking all sessions for a user (bump the version, every outstanding JWT fails the
  version check in `getAuthContext()`).
- Login lockout: 5 failed attempts / 15 minutes per email, tracked in `LoginAttempt`, extended to MFA
  code-verification attempts.
- MFA: real TOTP enrollment (QR/manual secret), verification, single-use backup codes, and disable (requires
  password re-entry), with the secret encrypted at rest (`src/lib/auth/crypto.ts`) — `src/lib/auth/mfa.ts`,
  `src/app/api/v1/auth/mfa/*`. The post-password `mfaToken` (5 min TTL) is a single-use nonce, not just a
  short-lived JWT — each jti is burned on its first use via a real unique-constraint violation
  (`MfaChallengeUse`), so a captured token can't be replayed for multiple guesses within its TTL. Org admins can
  require MFA for every member (`PATCH /api/v1/organization`); an unenrolled member under that policy can still
  log in (a session is needed to reach the enrollment API) but is blocked from the rest of the app until they
  enroll, and can't disable MFA themselves while the policy is active.

## Authorization (RBAC)

Permission keys, never role names, gate every action (`src/lib/permissions`). Role→permission grants are database
rows scoped per organization. `requirePermission()` throws a typed `ForbiddenError` that the shared route wrapper
(`src/lib/api/handler.ts`) turns into a 403 — there is no route that checks permissions ad hoc.

## Controlled AI autonomy

- Every AI call is logged (`AIActivityLog`): provider, model, prompt version, input, output, confidence, token
  usage, cost.
- The AI layer never creates an `ApprovalRequest`, marks a request approved, or issues a `PurchaseOrder` — those
  transitions only happen through routes that call the deterministic policy engine
  (`src/lib/policy/engine.ts`) first.
- `NegotiationAuthority.autoNegotiateEnabled` defaults to `false` for every new organization. Even when an org
  enables it, there is no code path today that reads `allowFinalize` as permission to complete a purchase —
  negotiation is drafted by AI and only ever sent by an authenticated human
  (`/api/v1/negotiations/:id/send`).
- Human corrections to AI output are preserved (`AICorrection`), never overwritten in place.

## Supplier portal

The one intentionally unauthenticated surface. `RFQSupplier.secureToken` is 24 random bytes (192 bits), looked up
by a unique index — not enumerable, not derived from any other field. Portal routes are explicitly carved out of
the session check in `src/proxy.ts` rather than accidentally left open.

## Transport & headers

Security headers (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS
in production) are set globally in `next.config.ts`. HTTPS termination is expected at the deployment layer (not
provisioned by this repo — see KNOWN_LIMITATIONS.md).

## Secrets

`AUTH_SECRET`, `ANTHROPIC_API_KEY`, and `RESEND_API_KEY` are read from environment variables only; `.env` is
git-ignored, `.env.example` documents required shape without real values.

## Gaps (tracked, not hidden)

No automated dependency/secret scanning wired into CI yet, no rate limiting beyond login lockout, and no
penetration test has been performed. Virus scanning on document upload is real but opt-in
(`VIRUS_SCAN_DRIVER=clamav`, unset by default) — see KNOWN_LIMITATIONS.md for the full list and what's not yet
activated by default.
