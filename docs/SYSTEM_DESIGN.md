# Karkana — System Design (v2)

> Status: **approved direction** — full rebuild of UI *and* architecture.
> Supersedes: the `7b61a7d` "storefront final UX updates" architecture.
> Stack baseline (verified in this repo on 2026-09-27): Next.js **16.3.6**, React **19.3.0**,
> TypeScript **5.9.3**, Tailwind **4.3.3**, Zod **4.6.5**, Drizzle ORM **0.45.3**, Vitest **5.0.2**.

---

## 1. What was wrong with v1

Findings below are from reading `7b61a7d`, not from assumption.

| # | Finding | Evidence | Consequence |
|---|---------|----------|-------------|
| 1 | **Order total trusted from the client.** `checkout/page.tsx` posts `totalAmount: subtotal` and `api/orders/route.ts` stores `Number(body.totalAmount)` verbatim. Line prices come from the cart too. | `src/app/checkout/page.tsx:100`, `src/app/api/orders/route.ts` | Anyone can order the catalogue for ₹1 by editing the request body. This is the single most serious defect in v1. |
| 2 | **Cart persists whole `Product` objects** into `localStorage` (`karkana_cart_v1`), price included. | `src/context/CartContext.tsx` | Stale prices survive catalogue edits; cart payload grows with every field added to a product. |
| 3 | **Hardcoded HMAC session secret in source.** `ADMIN_SESSION_SECRET \|\| 'karkana_super_secret_session_key_2026_atelier_cred'`. | `src/lib/auth-token.ts:1` | A deployed instance without the env var is fully forgeable by anyone who reads the public repo. |
| 4 | **Authorization lives in `middleware.ts`.** It returns `401` JSON for 6 protected API path patterns. | `src/middleware.ts:52-64` | Next 16 **deprecates the `middleware` convention**, renames it to `proxy.ts` (function `proxy`, Node.js runtime by default, `runtime` config option rejected), and states proxy "should not be used as a full session management or authorization solution". v1's security model sits entirely in the deprecated layer. |
| 5 | **UI claims data that does not exist.** `data/karkana.db.json` contains **0** `PERSONALIZED` products, **0** featured, **0** popular (modules are `BASIC: 118`, `CUSTOMIZED: 20`). The home page hardcodes `KRK133–KRK138`, `118 PRODUCTS`, `20 PRODUCTS`, `₹499 COMMISSION`, and renders Popular/Featured sections that are always empty. | verified by aggregating the DB file | Storefront advertises a module with no products; counts drift the moment the catalogue changes. |
| 6 | **No test runner, no typecheck script.** `package.json` shipped `dev/build/start/lint` only. | `package.json` | Nothing in v1 was machine-verified. |
| 7 | **Two divergent persistence implementations.** `db.ts` (JSON) and `postgres.ts` (481 lines of hand-written SQL) re-implement the same query surface with different filter semantics. | `src/lib/db.ts`, `src/lib/postgres.ts` | Every feature is written twice and drifts. |
| 8 | **No validation contract.** Route handlers do ad-hoc `if (!body.x)` checks; the checkout re-implements the mobile-number regex client-side only. | `api/orders/route.ts`, `checkout/page.tsx:66` | Server accepts a malformed order shape; client and server rules differ. |
| 9 | **Catalogue completeness is unknown at runtime.** All 138 rows have `description: ""` and `stock_quantity: null`. | DB aggregation | Product pages fall back to a generic lorem-style sentence; "in stock" is a guess. |
| 10 | **No customer identity.** Orders are anonymous; no history, no saved address, no wishlist. | `src/types/index.ts` | Repeat purchase requires re-typing everything; no way to look up an old order except by URL. |

---

## 2. Target architecture

Four layers, dependencies point **inward only**. Nothing in `core/` imports Next.js.

```
┌──────────────────────────────────────────────────────────────────────┐
│  INTERFACE            src/app  (RSC pages, route handlers, proxy.ts) │
│                       src/ui   (design-system primitives)            │
│                       src/features  (client components + hooks)      │
├──────────────────────────────────────────────────────────────────────┤
│  APPLICATION          src/core/services                             │
│                       placeOrder · catalogue queries · accounts ·    │
│                       order lifecycle · catalogue validation         │
├──────────────────────────────────────────────────────────────────────┤
│  DOMAIN               src/core/domain   src/core/schemas            │
│                       entities, invariants, pricing, status machine, │
│                       zod contracts (single source of truth)         │
│                       src/core/ports    repository/storage interfaces│
├──────────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE       src/infra/db (Drizzle+pg │ JSON file)          │
│                       src/infra/storage (S3/R2/B2 │ local disk)      │
│                       src/infra/auth (sessions, password hashing)    │
│                       src/infra/env (typed env)                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Rule enforced by review:** `core/` may import only `core/` + `zod`. `infra/` implements
`core/ports`. `app/`, `ui/`, `features/` may import anything outward-in.

### 2.1 Request paths

```
Browser ──> proxy.ts (Node runtime: subdomain rewrite + optimistic redirects + headers)
        ──> RSC page ──> guards ──> services ──> ports ──> pg | json
        ──> route handler (/api/v1/...) ──> requireAdmin()/requireCustomer()
                                          ──> zod parse ──> service ──> ports
        ──> Server Action ──> same guards ──> service ──> ports ──> updateTag
```

**Authorization moved out of the proxy.** Next 16 still *permits* a proxy to respond
directly, but documents it as unsuitable for authorization, so `proxy.ts` is limited to
what the docs bless: the `admin.karkana.com` → `/admin` rewrite, **optimistic** redirects
(no admin session cookie → `/admin/login`, no customer session on `/account/*` →
`/account/login`) and security headers. The authoritative check runs in
`src/infra/auth/guards.ts`, called by every protected route handler, Server Action and
admin layout — so a request that slips past the proxy is still rejected with `401`/`403`.

### 2.2 Data access

One set of **ports**, two adapters, selected by env in `src/infra/db/index.ts`:

| Adapter | When | Notes |
|---------|------|-------|
| `pg` (Drizzle) | `DATABASE_URL` set | Normalised schema, real FKs, generated migrations |
| `json` | dev only | Same domain objects; refuses to run when `NODE_ENV=production` |

Both return **the same domain objects** (`Product`, `Order` with `items[]`, `Customer`).
Normalisation stays inside the pg adapter — callers never see a join row.

### 2.3 Schema (Postgres)

```
products(id pk, name, brand, category, subcategory, description, short_description,
         price numeric, original_price numeric, discount_percent, stock_quantity int,
         unit, images jsonb, video, module enum, display_position int,
         is_featured bool, is_popular bool, is_visible bool, in_stock bool,
         search_keywords, safety_instructions, notes, image_width, image_height,
         aspect_ratio numeric, orientation enum, created_at, updated_at)

sections(id pk, key unique, title, subtitle, is_visible, display_position)

customers(id pk uuid, email unique citext, phone, name, password_hash,
          created_at, updated_at, last_login_at)
customer_addresses(id pk uuid, customer_id fk cascade, label, house_flat,
                   street_locality, city, state, pincode, instructions,
                   is_default bool, created_at)
wishlist_items(customer_id fk, product_id fk, created_at, pk(customer_id,product_id))

orders(id pk text 'KRK-…', customer_id fk nullable, customer_name, mobile,
       address jsonb, subtotal numeric, discount numeric, shipping numeric,
       total numeric, payment_method, payment_status, status enum,
       created_at, updated_at)
order_items(order_id fk cascade, product_id, product_name, product_image,
            unit_price numeric, quantity int, line_total numeric, module enum,
            personalization_image, customization_notes, pk(order_id,product_id))
```

Changes vs v1: orders are **normalised** (`order_items` is a table, not JSONB), totals are
**stored as computed columns**, orders carry an optional `customer_id`, and money is
`numeric(12,2)` everywhere.

### 2.4 Money and pricing (fix for finding #1)

`src/core/domain/pricing.ts` is a pure function and the **only** place totals are computed:

```ts
computeOrderTotals(lines: OrderLineInput[], policy: PricingPolicy): OrderTotals
// { subtotal, discount, shipping, total, lines[] } — all integers of paise
```

* All money is handled as **integer paise** internally; formatted at the edge (`formatINR`).
* The checkout sends **`{ productId, quantity, personalization? }` only**. The server
  re-reads each product, recomputes every line price and the total, and rejects unknown or
  invisible products. Client-supplied prices are ignored, never trusted.
* `PricingPolicy` carries `personalizationFeePaise` and `shippingPaise`. Both default to `0`
  to preserve v1 behaviour (v1 charged no commission despite the home page advertising
  "₹499 COMMISSION"). Flipping the fee on is a one-line config change, not a code change.

### 2.5 Order lifecycle (fix for ad-hoc status strings)

```
NEW ──> CONFIRMED ──> PREPARING ──> DISPATCHED ──> DELIVERED
 │           │            │             │
 └───────────┴────────────┴─────────────┴──> CANCELLED   (terminal: DELIVERED, CANCELLED)
```

`ORDER_TRANSITIONS` in `core/domain/order.ts` encodes this; the admin UI renders only legal
next states, and the API rejects illegal ones with `409`.

### 2.6 Identity (fix for findings #3 and #10)

* **Sessions:** stateless HMAC-SHA256 tokens (`node:crypto`, works in Node-runtime proxy and
  route handlers alike). Payload `{ sub, role: 'admin'|'customer', email, exp, sid }`.
  Two cookies: `karkana_admin` (admin) and `karkana_session` (customer), both `httpOnly`,
  `sameSite=lax`, `secure` in production.
* **Secrets:** `KARKANA_SESSION_SECRET` is **required**. In development, if absent, a random
  per-process secret is generated and a loud warning is printed — sessions simply expire on
  restart. In production, absence is a **fatal startup error**. No insecure default exists.
* **Passwords:** PBKDF2-HMAC-SHA256, 210k iterations, per-user 16-byte salt, stored as
  `pbkdf2$210000$<salt>$<hash>`, compared with `timingSafeEqual`.
* **Admin:** still env-driven (`ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH`) — single operator,
  no registration path exposed.
* **Customers:** self-registration (`email` + 10-digit phone + password), login, order
  history, saved addresses, wishlist. Guest checkout remains fully supported
  (`orders.customer_id` nullable).

### 2.7 Contracts

`src/core/schemas/` holds the **zod** schemas used by:

1. route handlers (`.parse()` at the boundary → `422` with field-level issues),
2. Server Actions,
3. client forms (same schema, imported directly — one rule set),
4. the JSON dev adapter on read (so a corrupt dev file fails loudly).

### 2.8 Caching

Next 16 makes caching opt-in. Policy:

* Catalogue reads use `use cache` + `cacheTag('products')` / `cacheTag('sections')`.
* Admin mutations call `updateTag()` in the same Server Action → read-your-writes for the
  operator, no stale storefront.
* Order pages are dynamic (`no-store`) — they are per-user.

---

## 3. Directory layout (target)

```
src/
  app/
    (storefront)/           home, module, product, search, cart, checkout, order/[id]
    (account)/account/      overview, login, register, orders, addresses, wishlist
    admin/                  dashboard, products, orders, sections, validation, login
    api/v1/                 products, orders, sections, auth, uploads, validation, metrics
    layout.tsx  globals.css  proxy.ts
  core/
    domain/   product.ts pricing.ts order.ts catalogue.ts account.ts
    schemas/  product.ts order.ts account.ts common.ts
    ports/    repositories.ts storage.ts clock.ts
    services/ catalogue.ts checkout.ts orders.ts accounts.ts validation.ts admin.ts
  infra/
    db/       schema.ts client.ts index.ts pg/ json/
    storage/  index.ts s3.ts local.ts
    auth/     session.ts password.ts guards.ts
    env.ts
  ui/         button badge card field input select textarea table tabs
              skeleton empty-state price quantity-stepper section-header
              product-card product-grid navbar footer drawer toast cn.ts
  features/
    cart/         provider, useCart, cart-lines
    checkout/     checkout-form
    personalization/ upload-widget
    search/   search-box, filters
    admin/    product-form, order-table, section-editor, validation-panel
scripts/      seed.ts  import-catalogue.mjs  smoke-test.mjs  ...
drizzle/      generated SQL migrations
docs/         SYSTEM_DESIGN.md  DESIGN_SYSTEM.md
tests/        colocated *.test.ts under src/**/__tests__
```

Deleted from v1: `src/lib/*`, `src/components/*`, `src/context/*`, `src/types/*`,
`src/middleware.ts` (replaced by `src/proxy.ts`).

---

## 4. Non-functional requirements

| Concern | Target |
|---------|--------|
| Typecheck | `tsc --noEmit` clean, `strict: true` |
| Lint | ESLint 9 flat config, `eslint-config-next` 16, zero errors |
| Tests | Vitest; domain + services + schemas + pricing + auth covered |
| Build | `next build` (Turbopack) clean |
| Smoke | `scripts/smoke-test.mjs` drives a real running server end-to-end |
| Mobile | 360 px first; 44 px minimum hit targets |
| A11y | Landmarks, focus rings, `aria-*` on all interactive controls, contrast ≥ 4.5:1 |
| Node | ≥ 20.9 (Next 16 floor) |

---

## 5. Migration & rollout

1. `data/karkana.db.json` is **seed data**, not the production store. `scripts/seed.ts`
   loads it into either adapter; products and their 138 images are untouched.
2. `scripts/migrate_to_production.mjs` is superseded by `npm run db:migrate`
   (Drizzle SQL migrations, versioned in `drizzle/`).
3. v1 `.mjs` scripts that duplicated app logic (`deep_validate.mjs`,
   `test_persistence_architecture.mjs`, `qa_runtime_suite.mjs`) are replaced by the service
   layer + Vitest + the smoke script.

## 6. Explicitly out of scope (v2)

Online payments (Razorpay/UPI), inventory reservation, shipping-rate tables, multi-locale,
product reviews. The pricing policy object is shaped so payments can be added without
touching `computeOrderTotals`.
