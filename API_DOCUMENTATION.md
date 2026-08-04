# API documentation (summary)

Base: same origin `/api/*`. Auth: HTTP-only cookie `buildiq_session` (JWT).

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | Requires `acceptTerms: true`; sends verification email |
| POST | `/api/auth/login` | Lockout after repeated failures |
| POST | `/api/auth/logout` | Bumps tokenVersion |
| GET | `/api/auth/me` | Current session |
| POST | `/api/auth/forgot-password` | Always returns ok |
| POST | `/api/auth/reset-password` | `{ token, password }` |
| POST | `/api/auth/verify-email` | Resend (auth) |
| PUT | `/api/auth/verify-email` | Confirm `{ token }` |

## Company / team

| Method | Path | Permission |
|---|---|---|
| GET | `/api/company/team` | team:view |
| POST | `/api/company/invite` | team:invite |
| POST | `/api/company/onboard` | company:manage |

## Projects & estimating

| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/projects` | project:read / project:write |
| GET/PATCH/DELETE | `/api/projects/:id` | read / write / delete |
| POST | `/api/projects/:id/blueprints` | blueprint:upload |
| POST | `/api/projects/:id/analyze` | estimate:run |
| GET | `/api/projects/:id/bots` | estimate:run (SSE) |
| POST | `/api/projects/:id/estimate` | estimate:run |
| GET/PATCH | `/api/projects/:id/bids` | bid:manage |
| GET | `/api/projects/:id/export` | project:read |
| GET | `/api/projects/:id/export/pdf` | project:read (estimate subtotals PDF) |
| POST | `/api/projects/:id/spruce` | spruce:sync |

## Commerce

| Method | Path | Permission |
|---|---|---|
| GET | `/api/shop/packages` | shop:browse |
| GET/POST/PATCH/DELETE | `/api/cart` | cart:manage |
| POST | `/api/checkout` | order:place |
| GET/POST | `/api/checkout/wallet` | order:place |
| GET | `/api/orders` | order:view |
| GET/POST | `/api/orders/:id` | order:view / order:advance |

## Account / modules

| Method | Path | Permission |
|---|---|---|
| GET | `/api/account/export` | account:export |
| DELETE | `/api/account/delete` | account:delete |
| GET | `/api/modules` | module:planned:view |

Errors: `{ error: string }` with appropriate HTTP status. Production avoids leaking internal messages.
