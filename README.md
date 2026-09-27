# Karkana

Storefront and operations console for a Hyderabad-based cracker retailer. 138 products across
three collections, cash-on-delivery checkout, customer accounts, and an admin console — all
server-rendered, all priced on the server.

**Stack:** Next.js 16.3 (App Router, Turbopack, `proxy.ts`) · React 19 · Tailwind CSS 4 ·
TypeScript 5.9 · Zod 4 · Drizzle ORM (Postgres) with a JSON adapter for development · Vitest.

Requires **Node 20.9 or newer**.

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```

With no `DATABASE_URL`, the app runs on the JSON adapter against `data/karkana.db.json` —
the 138-product catalogue is already committed, so the storefront works immediately.

### Switching to Postgres

Setting `DATABASE_URL` points the whole app at Postgres, but the schema is **not** created
automatically — an unprovisioned database answers every query with
`relation "customers" does not exist`. Seed it once:

```bash
DATABASE_URL='postgres://…' npx tsx scripts/seed.ts
```

This applies the SQL migrations in `drizzle/` and inserts the 138 products, sections and any
orders/customers from `data/karkana.db.json`. It is idempotent — existing rows are left
untouched. Later schema changes are applied with `npm run db:migrate`.

### Admin access

The operator account is environment-driven; there is no admin row in the database.

```bash
npx tsx scripts/hash-password.ts 'your password'
# → ADMIN_PASSWORD_HASH=pbkdf2$210000$…
```

Put that hash and `ADMIN_USERNAME` in `.env.local`, restart, and sign in at `/admin/login`.
Without a hash configured, admin login returns `503` rather than silently allowing access.

---

## Verifying a change

```bash
npm run verify       # typecheck && lint && test && build
```

| Command | What it runs |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .` (flat config, enforces the layer boundaries below) |
| `npm test` | 83 unit tests across pricing, money, orders, catalogue, validation, checkout, auth |
| `npm run build` | production build — 38 routes, all server-rendered on demand |

### Smoke test

The smoke test hits real HTTP: the proxy, the route handlers, the guards, the repositories
and the pricing service. It is not a re-implementation of them.

```bash
npm run dev &                                  # in one shell
npm run smoke                                  # in another
```

56 checks covering storefront rendering, internal link integrity, proxy redirects,
authorization, server-side pricing, order placement, the order state machine, customer
accounts and admin CRUD.

The run is idempotent: it purges any product left behind by an interrupted previous run
before asserting on catalogue counts, so it can be repeated safely.

It writes to a **scratch copy** of the database (`.smoke/karkana.db.json`, git-ignored) so the
committed catalogue is never modified. To also exercise the admin success path and the order
lifecycle, point it at a running server started with admin credentials:

```bash
KARKANA_DB_PATH=.smoke/karkana.db.json \
ADMIN_USERNAME=admin@karkana.com ADMIN_PASSWORD_HASH='pbkdf2$…' \
  npm run dev &

SMOKE_ADMIN_USERNAME=admin@karkana.com SMOKE_ADMIN_PASSWORD='your password' npm run smoke
```

---

## Architecture

Four layers, with the dependency direction enforced by ESLint rather than by convention.

```
src/core/      domain + services. No Next.js, no React, no I/O. Pure and unit-tested.
src/infra/     adapters: env, config, http envelope, auth, db (json + pg), storage.
src/features/  client components. May import core; may NOT import infra.
src/ui/        presentational primitives. May import core; may NOT import infra or features.
src/app/       routes, layouts and API handlers. The only place infra and features meet.
```

`src/core` defines the ports (`src/core/ports/index.ts`); `src/infra/db/index.ts` is the
composition root that wires a driver into them. Swapping JSON for Postgres is a single
environment variable, not a code change.

**Two documents describe the design in full:**

- [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md) — layering, data model, API contracts,
  the state machine, and the v1 defects this rebuild fixes.
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — the black/`#FF0033` identity, tokens,
  typography scale and component inventory.

### Money

Integer **paise** end to end. Products keep rupee values in Postgres (`numeric(12,2)`) and are
converted at the boundary; orders store paise. A cart sends only product ids and quantities —
the server recomputes every total, so a tampered client cannot change a price.

### Orders

`NEW → CONFIRMED → PREPARING → DISPATCHED → DELIVERED`, with `CANCELLED` reachable up to
`PREPARING`. `DELIVERED` and `CANCELLED` are terminal. Illegal transitions return `409`, and
the admin UI only offers transitions the state machine permits.

### Sessions

Stateless HMAC-SHA256 tokens in `httpOnly` cookies — `karkana_session` (customers, 30 days)
and `karkana_admin` (operators, 12 hours). `KARKANA_SESSION_SECRET` is **fatal if missing in
production**; development generates a per-process key. Passwords are PBKDF2-HMAC-SHA256 at
210,000 iterations with a per-password salt, compared in constant time.

`src/proxy.ts` does optimistic redirects for a nicer experience. It is not the security
boundary — every protected handler, server action and layout calls the guards in
`src/infra/auth/guards.ts`, which is authoritative.

---

## Routes

**Storefront** — `/`, `/module/[module]`, `/product/[id]`, `/search`, `/cart`, `/checkout`, `/order/[id]`

**Account** — `/account/login`, `/account/register`, and behind a session: `/account`,
`/account/orders`, `/account/addresses`, `/account/wishlist`

**Admin** — `/admin/login`, and behind an operator session: `/admin`, `/admin/products`,
`/admin/orders`, `/admin/sections`, `/admin/validation`

**API** — 19 handlers under `/api/v1` (products, cart, orders, addresses, wishlist, uploads,
sections, validation, metrics, auth). Every response uses one envelope:

```jsonc
{ "success": true,  /* …data */ }
{ "success": false, "error": "…", "code": "…", "issues": [{ "path": "…", "message": "…" }] }
```

---

## Data

- `data/karkana.db.json` — the committed catalogue: 138 products, 5 sections. Legacy
  snake_case and `₹ 180.00` fields are normalised on read by `src/infra/db/normalize.ts`.
- `data/karkana_138.csv` — the original source export.
- `public/uploads/products/` — 138 product images.

Override the JSON file with `KARKANA_DB_PATH` (used by the smoke test).

### Postgres

```bash
DATABASE_URL=postgres://… npm run db:push     # create the schema
DATABASE_URL=postgres://… npm run db:seed     # load the 138-product catalogue
```

`npm run db:seed` exits non-zero without a `DATABASE_URL` rather than falling back to JSON.

### Object storage

Personalization photos and admin uploads go to S3/R2 when `R2_*` variables are set, and to
`public/uploads` on the local disk otherwise.

---

## Configuration

Everything is declared once in `src/infra/env.ts` and validated at boot with Zod — an
unparseable value fails the process instead of surfacing later. See `.env.example` for the
full list; the notable ones:

| Variable | Purpose |
| --- | --- |
| `KARKANA_SESSION_SECRET` | Session signing key. Required in production. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | The operator login. No hash ⇒ login returns 503. |
| `DATABASE_URL` | Switches the whole app from JSON to Postgres. Required in production. |
| `KARKANA_PERSONALIZATION_FEE` | Paise added per personalized item. Default 0. |
| `KARKANA_SHIPPING_FEE` / `KARKANA_FREE_SHIPPING_OVER` | Flat shipping and its waiver threshold, in paise. |

---

## Known gaps

Deliberate, and worth knowing before you ship:

- **No online payments.** COD only, as specified. A delivered COD order is marked `PAID`;
  nothing is reconciled against a gateway.
- **Stock is not decremented.** `stock_quantity` is `null` on all 138 catalogue rows, so
  `inStock` is a display flag, not an inventory counter.
- **The free-shipping claim is not implemented.** The v1 site advertised "free shipping over
  ₹499"; `KARKANA_FREE_SHIPPING_OVER` defaults to unset, so no threshold applies until you
  set one.
- **The Postgres adapter is unexercised here.** There is no database in this sandbox, so
  `scripts/seed.ts` and the pg repositories are written and type-checked but have not been
  run end to end. The JSON adapter is fully covered by the smoke test.

---

## Layout

```
docs/            SYSTEM_DESIGN.md, DESIGN_SYSTEM.md
scripts/         hash-password.ts, seed.ts, smoke-test.mjs
scripts/legacy/  the superseded v1 scripts, kept for reference
src/core/        domain, schemas, ports, services
src/infra/       env, config, http, auth, db, storage
src/ui/          16 presentational primitives
src/features/    cart, catalogue, product, checkout, account, admin
src/app/         routes, layouts, _shell/, api/v1
```
