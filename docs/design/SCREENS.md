# BuildIQ Screen Specifications

Exact screens for **v1 monorepo** (Expo mobile + Next web). Implement these before inventing new surfaces.

---

## Shared IA

| Dest | Mobile tab | Web nav |
|---|---|---|
| Jobs | Jobs | Jobs |
| Proposals | Proposals | Proposals |
| Shop | Shop | Shop |
| Cart / Orders | Cart · Track | Orders |
| More | Account sheet | Settings · Team · Cabinetry · Agents |

Auth: Login · Signup · Forgot password · (mobile) biometric unlock later.

---

## Mobile (Expo)

### M0 — Splash / Boot
- Full-bleed dark `#161412` · centered IQ mark · orange progress hairline  
- No generic Expo splash template artwork  

### M1 — Login
- Composition: photo panel (tablet landscape) OR stacked (phone)  
- Elements: IQ logo, hand “Welcome back”, display “Sign in”, email, password, primary CTA, forgot / signup links  
- Motion: form fade-up 320ms on mount  

### M2 — Jobs (list)
- `HeroBand`: hand company name · “Jobs” · short supporting line · “New job” CTA  
- `premium-list` of `ListRow`: name, status badge, address/sf, plans·materials·bids, trailing price  
- Empty: brand + hand “Ready when you are” + CTA  
- Pull-to-refresh · skeleton 6 rows on first load  
- Optimistic: inserting new job row on create  

### M3 — Job detail
- Hero: project name + status + address  
- Action row: Run AI · Export · Create proposal · Spruce (secondary)  
- Sections: Blueprints · Cost estimate · Takeoff · Bids  
- Tablet: left summary / right takeoff table  

### M4 — Proposals list
- Hero “Proposals”  
- Compose card: project picker + Create  
- List rows: number, status, title, categories, total + deposit  

### M5 — Proposal detail
- Hero with total + deposit  
- Actions: PDF · Send · Copy link · Edit  
- Category sections with line tables  
- Accept record when present  

### M6 — Shop
- Hero “Material packages”  
- Horizontal square `FilterChip`s (All + categories)  
- Package cards: category kicker, name, bullets, price panel, Add to cart  
- Optimistic cart badge increment  

### M7 — Cart
- Line list · tax · total · Apple/Google Pay / card CTA  
- Skeleton while totals load  

### M8 — Track / Order detail
- Vertical step timeline (square nodes, orange active)  
- Order meta + items  

### M9 — Account
- Company · role · team invite · Spruce settings · sign out · delete account  

### Gestures
- Swipe back (native stack)  
- Swipe to dismiss sheets  
- Long-press job row → quick actions (Proposal · Shop packages)  

### Performance budget
- JS thread interaction < 100ms  
- List scroll 60fps on mid-tier Android  
- Images: progressive, cached, max decode size capped  

---

## Web dashboard (Next.js)

### W1 — Login
- Two-column: lumber photo + form panel (same tokens)  

### W2 — Jobs
- Wider `max-w` 1120 · same hero + list density as mobile, more meta columns  

### W3 — Job detail
- Desktop grid: blueprints | estimate · takeoff full width below  

### W4–W6 — Proposals / Shop / Orders
- Mirror mobile information architecture with denser tables  

### W7 — Cabinetry hub
- Opportunities table · product lines · link into proposals  

### W8 — Team / Settings / Agents
- Utility pages; same chrome; no alternate theme  

---

## API surfaces (NestJS) required by these screens

| Screen needs | Endpoints (initial) |
|---|---|
| Auth | `POST /auth/login|register|logout` `GET /auth/me` |
| Jobs | `GET/POST /projects` `GET/PATCH/DELETE /projects/:id` |
| Plans | `POST /projects/:id/blueprints` |
| Takeoff / estimate | `POST /projects/:id/orchestrate` `GET estimate` |
| Proposals | `GET/POST /proposals` `GET/PATCH /proposals/:id` `POST .../send` `GET .../pdf` |
| Public accept | `GET/POST /public/proposals/:token` |
| Shop | `GET /shop/packages` `GET/POST /cart` `POST /checkout` |
| Orders | `GET /orders` `GET /orders/:id` |
| Cabinetry | `GET/POST /cabinetry/opportunities` |
| Health | `GET /health` |

All authenticated routes: JWT bearer (mobile) or httpOnly cookie (web) · company scoping · `@buildiq/permissions` checks.

---

## Out of scope for first monorepo cut

- Full offline sync queue  
- Native store submission binaries  
- Live Stripe without keys  
- Complete 25 construction modules  

Those keep status PARTIAL/PLANNED in module registry; screens above are the premium spine.
