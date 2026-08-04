# Implementation checklist

Track: `pending` · `active` · `blocked` · `completed`

**Backup:** `cursor/backup-pre-platform-rebuild-dc6e`  
**This work:** `cursor/fix-incomplete-items-dc6e`

---

## Gate 0 — Audit

| ID | Task | Status |
|---|---|---|
| G0.1 | Repository audit | completed |
| G0.2 | Backup branch | completed |
| G0.3 | Architecture docs | completed |
| G0.4 | Owner architecture decision (Expo vs other) | blocked — Expo client not started |
| G0.5 | Approval for store submit / public deploy | blocked |

---

## Phase 1 — Stabilize API (this pass)

| ID | Task | Status |
|---|---|---|
| P1.1 | Fail-closed payments | completed |
| P1.2 | Logout token revoke | completed |
| P1.3 | Fix SW private caching | completed |
| P1.4 | Schema + auth/audit tables (SQLite push) | completed |
| P1.5 | RBAC requirePermission on APIs | completed |
| P1.6 | Expand roles + PERMISSIONS_MATRIX | completed |
| P1.7 | Password reset + email verification | completed |
| P1.8 | Account lockout | completed |
| P1.9 | Audit log foundation | completed |
| P1.10 | Object storage signed URLs | pending |
| P1.11 | Boot assertProductionSecrets | completed |
| P1.12 | Auth/RBAC/upload tests | completed |
| P1.13 | API docs | completed |

---

## Phase 2 — Docs

| ID | Task | Status |
|---|---|---|
| P2.1 | SETUP / SECURITY / PRIVACY_DATA_MAP | completed |
| P2.2 | PERMISSIONS_MATRIX | completed |
| P2.3 | API_DOCUMENTATION / DATABASE_SCHEMA | completed |
| P2.4 | TESTING / DEPLOYMENT | completed |
| P2.5 | IOS / ANDROID release checklists | completed |
| P2.6 | Threat model (in SECURITY.md) | completed |
| P2.7 | Accessibility audit checklist | pending |

---

## Phase 3–6

| Phase | Status |
|---|---|
| 3 Expo scaffold | pending (blocked on G0.4) |
| 4 Jobsite offline/camera/push | pending |
| 5 Full construction modules | pending — PLANNED scaffolds only |
| 6 Store submission | blocked on owner approval |

---

## Module scaffolds

| Item | Status |
|---|---|
| `/modules` hub + honest planned empty states | completed |
| Fake CRM/RFI/etc. CRUD | intentionally not built |
