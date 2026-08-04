# Testing

```bash
npm test          # unit tests (node:test via tsx)
npm run typecheck
npm run lint
```

## Current automated coverage

- Upload MIME/magic validation (`tests/uploads.test.ts`)
- RBAC permission matrix samples (`tests/permissions.test.ts`)
- Payment mock-allow helpers (`tests/payments.test.ts`)

## Still needed (tracked)

- Auth flow integration (register → verify → login → logout revoke)
- Tenant isolation API tests
- Account deletion + file purge
- Checkout fail-closed in production env
- Playwright e2e on critical paths
- Accessibility automated checks

Do not treat compile success as proof the app works.
