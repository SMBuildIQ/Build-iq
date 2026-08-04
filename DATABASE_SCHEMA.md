# Database schema

ORM: Prisma 5. Provider today: **SQLite** (`DATABASE_URL`). Production target: **PostgreSQL** (same schema).

## Core tenants

- `Company` — builder workspace
- `User` — credentials, `tokenVersion`, `emailVerifiedAt`, `termsAcceptedAt`, `deletedAt`
- `Membership` — user↔company + `role` string (see PERMISSIONS_MATRIX.md)
- `Invite` — invite codes

## Estimating

- `Project`, `Blueprint`, `MaterialItem`, `Estimate`, `BidPackage`
- `SpruceSettings`, `SpruceSyncLog`

## Commerce

- `MaterialPackage`, `Cart`, `CartItem`, `Order`, `OrderItem`, `TrackingEvent`

## Auth / security

- `AuthToken` — hashed email-verify / password-reset tokens
- `LoginAttempt` — lockout counters
- `AuditLog` — significant actions

## Roadmap registry

- `ModuleRegistry` — slug/status for platform modules (seeded from `src/lib/modules/registry.ts`)

## Migrations

Development may use `prisma db push`. Prefer `prisma migrate` for shared environments. Checked-in historical migration may lag; after schema changes run:

```bash
npx prisma migrate dev --name describe_change
```

## Indexes

Unique: Company.slug, User.email, Invite.code, MaterialPackage.slug, Order.orderNumber, AuthToken.tokenHash, LoginAttempt.email, ModuleRegistry.slug  
Composite: Membership(userId, companyId), AuthToken(userId, type), AuditLog(companyId, createdAt)
