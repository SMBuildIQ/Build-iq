# Permissions matrix (auditable)

Source of truth: `src/lib/permissions.ts` — enforced via `requirePermission()` on API routes.

Roles: OWNER · ADMIN · PROJECT_MANAGER · SUPERINTENDENT · ESTIMATOR · PURCHASING · ACCOUNTANT · DESIGNER · SALES · SUBCONTRACTOR · SUPPLIER · HOMEOWNER · VIEWER

| Permission | Owner | Admin | PM | Super | Estimator | Purch | Acct | Designer | Sales | Sub | Supplier | Homeowner | Viewer |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| company:manage | ✓ | ✓ | | | | | | | | | | | |
| team:invite | ✓ | ✓ | | | | | | | | | | | |
| team:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | ✓ |
| project:read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ |
| project:write | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | | | |
| project:delete | ✓ | ✓ | | | | | | | | | | | |
| blueprint:upload | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | | | |
| estimate:run | ✓ | ✓ | ✓ | | ✓ | | | | | | | | |
| estimate:approve | ✓ | ✓ | ✓ | | | | ✓ | | | | | | |
| bid:manage | ✓ | ✓ | ✓ | | ✓ | | | | | ✓ | | | |
| shop:browse | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ | | ✓ | | ✓ |
| cart:manage | ✓ | ✓ | ✓ | | ✓ | ✓ | | | | | | | |
| order:place | ✓ | ✓ | ✓ | | | ✓ | | | | | | | |
| order:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | | ✓ | | ✓ |
| order:advance | ✓ | ✓ | | | | ✓ | | | | | | | |
| spruce:configure | ✓ | ✓ | | | | | | | | | | | |
| spruce:sync | ✓ | ✓ | ✓ | | ✓ | ✓ | | | | | | | |
| account:export | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| account:delete | ✓ | | | | | | | | | | | | |
| settings:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| module:planned:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Enforcement notes

- Tenant isolation (`companyId`) is separate from RBAC and remains mandatory.
- UI may hide actions; **API denial is authoritative**.
- Invite flow currently allows internal roles only (not HOMEOWNER / SUBCONTRACTOR / SUPPLIER) — those roles are reserved for future portal memberships.
