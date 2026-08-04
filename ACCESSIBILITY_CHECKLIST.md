# Accessibility audit checklist (WCAG 2.2 AA)

| Check | Status | Notes |
|---|---|---|
| Skip to content link | done | `SkipToContent` |
| `main` landmark + id | done | App shell + public pages |
| Form labels | partial | Login/signup/account use labels; audit remaining forms |
| Focus visible | partial | Tailwind focus-visible on many controls |
| Color not sole status | pending | Status badges need text/icons review |
| Contrast | pending | Manual check copper/sage on paper |
| Touch targets ≥44px | partial | Bottom tabs and primary buttons sized |
| Dynamic type / zoom | done | Viewport does not lock max-scale |
| Reduced motion | pending | Add `prefers-reduced-motion` for animations |
| Screen reader on cart badge | pending | Add aria-label with count |
| Error messages associated | partial | role=alert on some auth forms |
| Charts | n/a | No charts yet |
| Keyboard order | pending | Full pass needed |

Unresolved issues remain listed as pending above — do not claim AA compliance until a full pass is completed on device.
