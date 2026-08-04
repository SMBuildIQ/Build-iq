# BuildIQ Design System — “Millwork Studio”

**Product:** BuildIQ by Supply Monkey Lumber & Materials Co  
**Audience:** Builders, estimators, cabinetry sales, purchasing  
**Tone:** Luxury jobsite — industrial millwork, not SaaS template  
**Platforms:** Expo (iOS/Android/tablet) · Next.js web dashboard  

This document is the **source of truth**. Do not invent alternate palettes, font stacks, or generic “modern” patterns.

---

## 1. Brand principles

1. **Brand first** — Supply Monkey / IQ mark is a hero-level signal on marketing and empty states.
2. **Material honesty** — Surfaces feel like paper, millwork, and steel; not glassmorphism or neon glow.
3. **One composition** — First viewport of any screen has one job; no dashboard clutter in heroes.
4. **Sharp geometry** — Default corner radius is `0`. Soft radii only for circular avatars/badges.
5. **Motion with purpose** — 2–3 intentional motions per flow; 60–120 FPS; no bounce spam.
6. **Forbidden defaults** — No Inter/Roboto/Arial as display; no purple gradients; no cream+#terracotta cliché; no multi-layer drop shadows; no emoji UI; no rounded-full pill filters.

---

## 2. Color tokens

### Light (`color.light`)

| Token | Hex | Usage |
|---|---|---|
| `bg.canvas` | `#F3EEE6` | App background |
| `bg.surface` | `#FFFDF9` | Cards / sheets |
| `bg.surfaceMuted` | `#EBE4DA` | Nested panels |
| `bg.inverse` | `#161412` | Hero bands, chrome |
| `bg.inverseLift` | `#221E1B` | Elevated dark |
| `text.primary` | `#3D2A1D` | Body / titles |
| `text.secondary` | `#6A5343` | Supporting |
| `text.muted` | `#6D6762` | Meta |
| `text.inverse` | `#FFFDF9` | On dark |
| `accent.primary` | `#FF8833` | CTAs, prices, active |
| `accent.primaryPressed` | `#E67420` | Pressed |
| `accent.brand` | `#5D412D` | Secondary CTA fill |
| `accent.brandInk` | `#3D2A1D` | Strong brown |
| `border.subtle` | `rgba(93,65,45,0.14)` | Dividers |
| `border.strong` | `rgba(93,65,45,0.28)` | Inputs / filters |
| `border.focus` | `#FF8833` | Focus ring |
| `status.draft` | `#6A5343` | Draft |
| `status.progress` | `#FF8833` | Analyzing / viewed |
| `status.success` | `#3D2A1D` | Accepted / estimated |
| `status.danger` | `#9B2C2C` | Declined / error |
| `overlay.scrim` | `rgba(22,20,18,0.55)` | Modals |

### Dark (`color.dark`)

| Token | Hex |
|---|---|
| `bg.canvas` | `#12100E` |
| `bg.surface` | `#1C1916` |
| `bg.surfaceMuted` | `#26211D` |
| `bg.inverse` | `#FFFDF9` |
| `text.primary` | `#F5EFE6` |
| `text.secondary` | `#C9B8A6` |
| `text.muted` | `#9A8B7C` |
| `text.inverse` | `#161412` |
| `accent.primary` | `#FF8833` |
| `accent.primaryPressed` | `#FF9B52` |
| `accent.brand` | `#C4A484` |
| `border.subtle` | `rgba(245,239,230,0.10)` |
| `border.strong` | `rgba(245,239,230,0.22)` |

Semantic aliases: `success`, `warning`, `danger`, `info` map through status tokens above — never invent teal/purple status chips.

---

## 3. Typography

| Role | Family | Weight | Size (mobile) | Size (tablet/web) | Tracking | Case |
|---|---|---|---|---|---|---|
| Display | Staatliches | 400 | 40–56 | 48–72 | 0.05em | Upper |
| Title | Staatliches | 400 | 28–32 | 32–40 | 0.04em | Upper |
| Hand accent | felt-tip-woman (Typekit) | 400 | 20–24 | 22–28 | 0 | Sentence |
| Body | Questrial | 400 | 15–16 | 16–17 | 0.01em | Sentence |
| Label | Questrial | 600–700 | 11–12 | 11–12 | 0.16em | Upper |
| Mono / SKU | ui-monospace | 500 | 11 | 12 | 0.04em | As-is |
| Price | Staatliches | 400 | 28–36 | 32–44 | 0.04em | — |

**Line height:** Display 1.05 · Title 1.1 · Body 1.45 · Label 1.2  

**Fallbacks:** Staatliches → Impact → sans-serif · Questrial → system-ui  

---

## 4. Spacing & layout

Base unit: **4px**

| Token | Value |
|---|---|
| `space.1`–`space.12` | 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 |
| `screen.gutter` | 20 (phone) / 32 (tablet) / 40 (web) |
| `screen.max` | 1120 web content |
| `section.gap` | 32–48 |

**Safe areas:** Honor notch / home indicator. Bottom tabs clear `space.6` above gesture bar.

**Tablet:** Two-column jobs list + detail from `md` (≥768). Prefer split view over stacking everything.

---

## 5. Radius, stroke, elevation

| Token | Value | Notes |
|---|---|---|
| `radius.none` | 0 | **Default for all chrome** |
| `radius.full` | 999 | Avatars only |
| `stroke.hairline` | 1 | Borders |
| `stroke.cta` | 2 | Buttons |
| `elevation.0` | none | Default |
| `elevation.1` | `0 1px 0 rgba(61,42,29,0.06)` | List separators preferred over shadows |
| `elevation.sheet` | `0 -8px 32px rgba(22,20,18,0.18)` | Bottom sheets only |

Avoid stacked soft shadows. Prefer border + background contrast.

---

## 6. Motion

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion.fast` | 120ms | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Press / opacity |
| `motion.base` | 220ms | same | Screen transitions |
| `motion.enter` | 320ms | same | Shared element / sheet |
| `motion.spring` | — | stiffness 280, damping 28 | Gesture settle (Reanimated) |

**Required on mobile:**
1. Shared-element job → detail (title + price)
2. Tab indicator slide
3. Skeleton → content crossfade  

Target **60 FPS minimum**, **120 FPS** on ProMotion where available (`requestAnimationFrame` / Reanimated UI thread). Respect `prefers-reduced-motion`.

---

## 7. Iconography & imagery

- Icons: 1.5–2px stroke, square optical bounds, Lucide-compatible set customized — **not** filled playful icons.
- Photography: Yard lumber stacks, millwork grain, cabinetry elevations — warm, desaturated slightly.
- Hero bands: Full-bleed photo + dark scrim + 3px orange rule at bottom.
- Empty states: Brand mark + hand accent line + one CTA.

---

## 8. Components (contract)

Every component ships light + dark, a11y labels, and loading/disabled states.

### `Button`
- Variants: `primary` (orange fill), `secondary` (brown outline), `inverse` (on dark), `ghost`
- Height: 48 phone / 44 compact
- Type: Staatliches label, tracking 0.08em
- Press: scale 0.98 + color to `primaryPressed` (120ms)

### `TextField`
- Height 52 · strong border · label above (Label style)
- Focus: orange border, no glow halo beyond 1px

### `FilterChip`
- Square · uppercase label · active = brandInk fill / inverse text
- **Never** rounded-full pills

### `ListRow`
- Min height 76 · hairline top border · title + meta + trailing price
- Pressed background `surfaceMuted`

### `StatusBadge`
- Square hairline border · uppercase 11px · no pastel candy fills

### `HeroBand`
- Min height 168 · photo background · hand eyebrow · display title · optional CTA

### `Skeleton`
- Shimmer on `surfaceMuted` → `surface` · respect reduced motion (static)

### `BottomTabs`
- 5 destinations · active orange hairline on top · labels uppercase 10px tracking 0.16em

### `Sheet`
- Sharp top corners · grabber · elevation.sheet · dismissible swipe

---

## 9. Accessibility

- Minimum contrast AA for text/icons
- Hit targets ≥ 44×44
- Dynamic Type / font scaling up to 1.3× without clipping primary CTAs
- Screen reader labels on icon-only controls
- Focus order matches visual order on web

---

## 10. Package mapping

| Concern | Package |
|---|---|
| Colors, type, space, motion | `@buildiq/design-tokens` |
| Domain DTOs | `@buildiq/types` |
| Zod schemas | `@buildiq/validation` |
| RBAC matrix | `@buildiq/permissions` |
| Estimate / proposal math | `@buildiq/pricing` |

Token export formats: JSON (source) · TS const · CSS variables · Expo theme object.
