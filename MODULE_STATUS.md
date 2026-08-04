# Module status — construction platform

Legend: **FULL** = usable in production paths · **PARTIAL** = real code but incomplete · **PLANNED** = architecture slot only · **NONE** = not started

| # | Module | Status | Notes |
|---|---|---|---|
| 1 | Dashboard | PARTIAL | Job list only; no KPIs, schedule, or alerts |
| 2 | Leads and CRM | NONE | — |
| 3 | Clients | NONE | — |
| 4 | Projects | FULL | Company-scoped CRUD + status |
| 5 | Estimates and budgets | PARTIAL | Cost rollup exists; no budget versions / approvals |
| 6 | Plan and document uploads | PARTIAL | Plans/PDFs/images; no folders, versions, signed URLs |
| 7 | Material takeoffs | PARTIAL | AI/local scale; not true plan digitizing |
| 8 | Subcontractor bid management | PARTIAL | Internal bid packages; no sub portal or bid invite emails |
| 9 | Purchase orders | NONE | Shop material orders ≠ POs |
| 10 | Scheduling | NONE | — |
| 11 | Daily logs | NONE | — |
| 12 | Photos and videos | NONE | Plan images only; no jobsite camera gallery |
| 13 | RFIs | NONE | — |
| 14 | Submittals | NONE | — |
| 15 | Change orders | NONE | — |
| 16 | Selections and approvals | NONE | — |
| 17 | Invoices and progress billing | NONE | Checkout receipts only |
| 18 | Budget-versus-actual reporting | NONE | — |
| 19 | Client portal | NONE | — |
| 20 | Vendor and subcontractor portal | NONE | — |
| 21 | Punch lists | NONE | — |
| 22 | Warranty management | NONE | — |
| 23 | Notifications | NONE | No in-app / push / email system |
| 24 | AI assistant | PARTIAL | Fixed bot pipeline after upload; not conversational; draft-quality |
| 25 | Company settings and team permissions | PARTIAL | Invites + Spruce + account; roles mostly labels |

## Related commerce (not in the 25)

| Area | Status |
|---|---|
| Material package shop / cart | PARTIAL (mock payments by default) |
| Order tracking | PARTIAL (simulated advance button) |
| ECI Spruce | PARTIAL (mock default; live SOAP stubby) |
| Excel export | FULL |
| PDF estimate / subtotals export | FULL |
| Account deletion / data export | FULL (API + UI) |
| Privacy / Terms / Support pages | PARTIAL (entity placeholders remain) |

**Rule:** New modules are scaffolded with empty states and “Planned” labels — never fake “Save” buttons that do nothing.
