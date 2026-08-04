# Implementation checklist

Track: `pending` · `active` · `blocked` · `completed`

**Backup:** `cursor/backup-pre-platform-rebuild-dc6e`  
**This work:** `cursor/fix-incomplete-items-dc6e`

---

## Launch readiness (web/PWA)

| ID | Task | Status |
|---|---|---|
| L1 | Production build | completed |
| L2 | Unit tests + smoke script | completed |
| L3 | `/api/health` readiness | completed |
| L4 | CI workflow | completed |
| L5 | LAUNCH_CHECKLIST.md | completed |
| L6 | Supply Monkey + IQ branding | completed |
| L7 | Legal drafts + contacts | completed |
| L8 | Soft-launch deploy (HTTPS + secrets) | blocked — needs your hosting |
| L9 | Attorney-final policies | blocked — counsel |
| L10 | App Store / Play submit | blocked — your approval + Cap natives |

---

## Gate 0 — Audit

| ID | Task | Status |
|---|---|---|
| G0.1–G0.3 | Audit + backup + docs | completed |
| G0.4 | Expo architecture decision | blocked |
| G0.5 | Store submit / public deploy approval | blocked |

---

## Phases 1–2

Completed (RBAC, auth, payments fail-closed, docs). Object storage still pending.

## Phases 3–6

Expo / offline / full module suite / store submit — pending or blocked as above.

See **[LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)** for go-live steps.
