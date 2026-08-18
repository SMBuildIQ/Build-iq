# Module status

Legend: **FULL** = real, tested, usable end to end · **PARTIAL** = real code, meaningful gaps · **PLANNED** =
schema modeled, no UI/API yet · **NONE** = not started.

Numbering follows the brief's MVP list (§37) where it maps directly.

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Multi-tenant org architecture | FULL | Org/Location/Membership/Role/Permission, tested cross-tenant isolation |
| 2 | Authentication | FULL | Session cookie JWT, bcrypt, login lockout; no MFA enforcement yet |
| 3 | RBAC/permissions | FULL | Permission-key checks, org-scoped roles, seeded default role set |
| 4 | Org/branch/user administration | PARTIAL | Settings page is read-only; no edit UI for locations/departments/cost centers yet |
| 5 | AI purchasing assistant | FULL | NL description → structured request, missing-field detection, full AIActivityLog trail |
| 6 | Purchase request creation | FULL | Structured line items, status history, tenant-scoped API + UI |
| 7 | Structured line items | FULL | Category/manufacturer/model/SKU/target price/substitutions |
| 8 | Vendor database | PARTIAL | Create/list suppliers + contacts; no historical-quote/performance-score computation yet |
| 9 | RFQ creation | FULL | Generated from a purchase request's line items, editable instructions |
| 10 | RFQ email distribution | PARTIAL | Real send via Resend when configured; logs instead of sending otherwise. Portal link always works |
| 11 | Supplier response portal | FULL | Token-authenticated, no account required, structured pricing/freight/terms entry |
| 12 | Quote PDF/Excel upload | NONE | Manual entry form instead — see KNOWN_LIMITATIONS.md |
| 13 | AI quote extraction | NONE | `QuoteExtractionField` modeled, not populated — manual entry is the current path |
| 14 | Quote normalization | FULL | Total landed cost computed from product total + freight (portal and manual entry both) |
| 15 | Side-by-side comparison | FULL | `/purchases/[id]/compare` |
| 16 | AI purchasing recommendation | FULL | Explainable rationale, mock heuristic + Anthropic-backed, logged to AIActivityLog |
| 17 | Human-assisted negotiation | FULL | AI drafts, human sends — no autonomous path exists in code |
| 18 | Approval engine | FULL | Deterministic PolicyRule evaluation, sequenced ApprovalSteps, role-gated decisions |
| 19 | Purchase order generation | FULL | Generated from an approved request + selected quote |
| 20 | Order tracking | FULL | Full status lifecycle with timeline |
| 21 | Basic receiving | FULL | Quantity received/damaged/missing per line item |
| 22 | Savings tracking | PARTIAL | `SavingsRecord` populated at quote selection; realized savings needs invoicing (not built) to complete |
| 23 | Dashboard/analytics | PARTIAL | Real counts and verified-savings sum; AI "purchasing insights" panel is honest-empty until there's history to analyze |
| 24 | Notifications | PLANNED | Schema ready, no dispatch/UI |
| 25 | Audit logs | PARTIAL | Every mutation writes AuditLog; no viewer UI yet |
| 26 | Document library | PLANNED | Schema ready, no upload endpoint or UI |
| 27 | Background job system | FULL | Persisted Job table, retries/backoff/dead-letter, worker process + inline dev fallback |
| 28 | API documentation | PARTIAL | See API_DOCUMENTATION.md; no generated OpenAPI/Swagger file yet |
| 29 | Automated testing | PARTIAL | Tenant isolation, permissions, policy engine, AI extraction unit/integration tests; no e2e browser tests yet |
| 30 | Production deployment | NONE | Dockerfile/docker-compose exist; no environment has actually been provisioned from this session |

## Not in the MVP list but modeled

Invoice / three-way matching (`Invoice`, `InvoiceLineItem`, `InvoiceMatchException`) and purchasing intelligence
benchmarking (`PriceBenchmark`) are fully modeled per brief §23/§25 but have no processing job or UI yet.

**Rule:** a module with no working UI shows an explicit "Planned" state (`src/components/PlannedModule.tsx`) that
names the backing schema — never a form that appears to save but doesn't.
