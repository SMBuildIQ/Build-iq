# API — v1

All routes below live under `/api/v1`. Authenticated routes require the `buildiq_session` cookie (set by
`/api/v1/auth/login` or `/api/v1/auth/register`) and are scoped to the session's active organization — there is no
way to pass an organization id as a parameter. Portal routes are the one public, token-authenticated exception.

A generated OpenAPI/Swagger document is not produced yet (see MODULE_STATUS.md #28) — this is a hand-written
reference kept in sync with `src/app/api/v1/**/route.ts`.

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Creates a user + a new organization (caller becomes Company Owner) |
| POST | `/auth/login` | Locks out after 5 failed attempts / 15 min per email |
| POST | `/auth/logout` | Clears the session cookie |
| GET | `/auth/me` | Current user, organization, roles, permissions |

## Purchase requests

| Method | Path | Permission |
|---|---|---|
| GET | `/purchase-requests` | `purchase_request:view` |
| POST | `/purchase-requests` | `purchase_request:create` |
| GET | `/purchase-requests/:id` | `purchase_request:view` |
| PATCH | `/purchase-requests/:id` | `purchase_request:edit` — status transitions only, validated against a fixed state machine |
| POST | `/purchase-requests/ai-parse` | `purchase_request:create` — extraction only, does not persist a request |
| POST | `/purchase-requests/:id/recommend` | `quote:review` — AI recommendation over received quotes |
| POST | `/purchase-requests/:id/select-quote` | `quote:review` — runs the policy engine, may create an ApprovalRequest |

## Suppliers

| Method | Path | Permission |
|---|---|---|
| GET | `/suppliers` | `supplier:view` |
| POST | `/suppliers` | `supplier:manage` |

## RFQs & quotes

| Method | Path | Permission |
|---|---|---|
| GET | `/rfqs` | `rfq:view` |
| POST | `/rfqs` | `rfq:create` — copies line items from the purchase request, creates one `RFQSupplier` per selected supplier |
| GET | `/rfqs/:id` | `rfq:view` |
| POST | `/rfqs/:id/send` | `rfq:create` — enqueues + processes the `rfq.send` background job |
| POST | `/rfq-suppliers/:id/quotes` | `rfq:create` — manual quote entry (PDF/Excel/email response) |
| POST | `/quotes/:id/negotiate` | `negotiation:initiate` — drafts, does not send |

## Negotiation

| Method | Path | Permission |
|---|---|---|
| POST | `/negotiations/:id/send` | `negotiation:initiate` — the only path that moves a negotiation out of "proposed"; always human-initiated |

## Approvals

| Method | Path | Permission |
|---|---|---|
| POST | `/approval-steps/:id/decide` | `approval:decide` + the step's required role (or `company_owner`) |

## Purchase orders

| Method | Path | Permission |
|---|---|---|
| GET | `/purchase-orders` | `purchase_order:view` |
| POST | `/purchase-orders` | `purchase_order:issue` — requires an `approved` purchase request + a `selected` quote |
| GET | `/purchase-orders/:id` | `purchase_order:view` |
| POST | `/purchase-orders/:id/status` | `purchase_order:issue` — validated state machine (issued → … → closed) |
| POST | `/purchase-orders/:id/receipts` | `receiving:record` |

## Public supplier portal (no session)

| Method | Path | Notes |
|---|---|---|
| GET | `/portal/rfq/:token` | Page, not API — RFQ detail for the invited supplier |
| POST | `/portal/rfq/:token/quote` | `{ action: "submit" \| "decline", ... }` — the token itself is the credential |

## Error shape

Errors are `{ "error": string }` with status 400 (validation), 401 (no session), 403 (missing permission), or 404
(not found — including a cross-tenant id, which never distinguishes "exists elsewhere" from "doesn't exist").
