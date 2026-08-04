# Privacy data map

Operator: **Supply Monkey Lumber & Materials Co**, 710 N Montezuma St, Prescott, Arizona 86302, United States.  
Support / privacy: **support@supplymonkeyco.com**.  
Governing law: **Arizona, United States**.

Suitable starting inventory for Apple App Privacy and Google Play Data Safety.

**Policy status:** in-app Privacy Policy and Terms are drafts requiring attorney review (`LEGAL_POLICIES_FINAL` unset).

| Data | Why collected | Stored where | Retention | Linked to user | Shared |
|---|---|---|---|---|---|
| Name, email | Account | SQLite/Postgres User | Until account delete (+ backup ≤30d) | Yes | No ads |
| Password hash | Auth | User.passwordHash | Until delete | Yes | No |
| Company info | Multi-tenant workspace | Company | Until company delete | Yes | Team members |
| Project/job fields | Estimating | Project | Until delete | Yes | Company members |
| Plan files | Takeoff | Local uploads/ (→ object storage planned) | Until account/company delete | Yes | AI provider if configured |
| Cart/orders/shipping | Materials commerce | Cart/Order | Until delete; Stripe retains payment records | Yes | Stripe |
| Payment method type | Checkout UX | Order.paymentMethod | With order | Yes | Stripe processes cards |
| Spruce credentials | Integration | SpruceSettings | Until removed | Company | ECI Spruce if live |
| Auth tokens | Reset/verify | AuthToken (hashed) | Until used/expiry | Yes | No |
| Audit logs | Security | AuditLog | Configurable | Often | No |
| Diagnostics | Reliability | Host logs | Short-lived | Possibly | Hosting provider |

**Tracking / advertising:** none. `dataUsedToTrackUser: false`.

**Children:** not directed to children under 13; not intended under 16.

Update this file whenever SDKs or data flows change.
