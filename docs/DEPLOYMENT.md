# Deploying Karkana to Vercel

Target: **https://karkana.setacore.com** · support contact **info@setacore.com**

This is a Next.js 16 (App Router) app. It is server-rendered, talks to a
Postgres database in production, and keeps every secret on the server. Below is
the full path from an empty Vercel account to a live, secured storefront.

---

## 0. What you need before you start

- A GitHub repo (this one) connected to Vercel.
- A Postgres database (Vercel Marketplace → **Neon**, or Supabase, or any
  managed Postgres). The JSON file store **refuses to run in production** —
  `DATABASE_URL` is mandatory on Vercel.
- An object-storage bucket (Cloudflare R2 / Backblaze B2 / any S3) **if** the
  admin will upload new product photos. The 138 catalogue images already ship
  in `public/uploads`, so this is only needed for new uploads.
- Node **20.9+** locally (Vercel runs Node 20/22 by default).

---

## 1. Provision the database

1. In Vercel: **Storage → Create → Neon (Postgres)**, or create a Supabase
   project and copy its connection string.
2. Copy the **pooled** connection string. On Neon it looks like
   `postgres://user:pass@ep-….pooler.region.aws.neon.tech/neondb?sslmode=require`.
   Always keep `?sslmode=require`.
3. Seed it from the committed catalogue. From your machine, with the repo
   installed (`npm ci`):

   ```bash
   DATABASE_URL='postgres://…?sslmode=require' npx tsx scripts/seed.ts
   ```

   `scripts/seed.ts` runs the migrations (`runMigrations`) and inserts the 138
   products, sections and any existing orders/customers from
   `data/karkana.db.json`. It is idempotent — existing rows are left untouched.

   > If you prefer explicit migration files over the seed script's built-in
   > migration step, the Drizzle config is in `drizzle.config.ts`
   > (`npm run db:generate` / `db:migrate` / `db:push`).

---

## 2. Create the admin operator

The admin login is **not** a plaintext password. Generate a hash and store the
hash:

```bash
npx tsx scripts/hash-password.ts 'a-long-unique-password'
# prints: ADMIN_PASSWORD_HASH=pbkdf2$…
```

Set `ADMIN_USERNAME` (default `admin@karkana.com` — change it to something
yours, e.g. `admin@setacore.com`) and `ADMIN_PASSWORD_HASH` to that output.
The admin control centre is served at **`/admin`** on the same host
(`https://karkana.setacore.com/admin`).

---

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

Add these for **Production** (and Preview if you want a working preview). None
of them use the `NEXT_PUBLIC_` prefix, so **none are ever sent to the browser** —
they exist only inside server functions, route handlers and `proxy.ts`.

| Variable | Value for this deploy | Notes |
| --- | --- | --- |
| `KARKANA_SITE_URL` | `https://karkana.setacore.com` | Drives canonicals, `sitemap.xml`, `robots.txt`, Open Graph. No trailing slash. |
| `KARKANA_SESSION_SECRET` | `openssl rand -hex 32` output | **Required in prod** (min 32 chars). The app refuses to boot without it. Mark **Sensitive**. |
| `DATABASE_URL` | pooled Postgres string with `?sslmode=require` | **Required in prod.** Mark **Sensitive**. |
| `ADMIN_USERNAME` | `admin@setacore.com` | Admin login id. |
| `ADMIN_PASSWORD_HASH` | from `scripts/hash-password.ts` | Never store the plaintext. Mark **Sensitive**. |
| `KARKANA_SUPPORT_EMAIL` | `info@setacore.com` | Footer, legal pages, `llms.txt`. (Already the code default.) |
| `KARKANA_SUPPORT_PHONE` | `7207294554` | Footer / contact. |
| `KARKANA_CITY` | `Hyderabad` | Footer, legal, "Ships from". |
| `KARKANA_ADMIN_HOST` | `karkana.setacore.com` | Admin host label. |
| `KARKANA_MIN_ORDER` | `530` | Minimum order in rupees, enforced server-side. `0` disables. |
| `KARKANA_SHIPPING_FEE` | `0` (or your fee) | Whole rupees. |
| `KARKANA_PERSONALIZATION_FEE` | `0` (or your fee) | Whole rupees. |
| `KARKANA_FREE_SHIPPING_OVER` | (optional) | Subtotal at which shipping is free. |
| `R2_ACCOUNT_ID` / `R2_BUCKET` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` / `R2_REGION` / `CDN_HOST` | only if admin uploads photos | Object storage for new uploads. Mark the secret/key **Sensitive**. |

`NODE_ENV=production` is set by Vercel automatically — do not add it.

Generate the session secret:

```bash
openssl rand -hex 32
```

---

## 4. Import and deploy

1. Vercel → **Add New → Project → Import** this GitHub repository.
2. Framework preset: **Next.js** (auto-detected). Build command `npm run build`,
   install `npm ci` — the defaults are correct, leave them.
3. Paste the environment variables from step 3.
4. **Deploy.** The first build prerenders the static routes and server-renders
   the dynamic ones.

---

## 5. Attach the custom domain `karkana.setacore.com`

1. Vercel → Project → **Settings → Domains → Add** `karkana.setacore.com`.
2. At your DNS provider for `setacore.com`, add the record Vercel shows —
   typically a **CNAME** `karkana` → `cname.vercel-dns.com` (or the `A` record
   Vercel lists). Because this is a subdomain, a CNAME is the usual choice.
3. Vercel issues the TLS certificate automatically once DNS resolves.
4. Make sure `KARKANA_SITE_URL` is exactly `https://karkana.setacore.com` so
   canonicals and the sitemap point at the real host.

---

## 6. Keeping the APIs and data secure

The API surface is `/api/v1/*` (19 routes). It is protected in layers; here is
what is already in place and what you should add on Vercel.

**Already in the code**

- **Same-origin only.** The APIs are called from the same origin as the site, so
  there is no CORS allowance to misconfigure — no cross-origin browser can read
  them.
- **Session-cookie auth + guards.** Every protected route handler, Server Action
  and the admin layout re-check the session in `src/infra/auth/guards.ts`.
  `proxy.ts` only does *optimistic* redirects and is explicitly **not** the
  authorisation layer (per the Next 16 docs).
- **Security headers on every response.** `proxy.ts` sets a per-request
  **CSP with a nonce** (so injected inline scripts cannot execute) and **HSTS**
  (sent only when `x-forwarded-proto: https`, which Vercel sets behind TLS).
- **Password hashing.** Admin and customer passwords are PBKDF2-hashed
  (`src/infra/auth/password.ts`); plaintext is never stored.
- **Auth rate limiting.** `src/infra/auth/rate-limit.ts` throttles login /
  register / admin-login attempts.
- **Server-only secrets.** No secret uses `NEXT_PUBLIC_`, so the bundle never
  leaks `DATABASE_URL`, the session secret, or the admin hash.
- **No production JSON store.** The file store throws at production runtime,
  forcing Postgres.

**Add on Vercel**

- **Durable rate limiting / WAF.** The built-in limiter is **per serverless
  instance (in-memory)**, so it is best-effort and resets as instances recycle.
  For real protection put **Vercel WAF / Firewall** (or Attack Challenge) in
  front of `/api/v1/auth/*`, or swap the limiter to a shared store such as
  **Upstash Redis**.
- **Mark sensitive env vars "Sensitive"** in Vercel so they are encrypted and
  not readable in the dashboard after save.
- **Database hygiene.** Use the **pooled** connection string, keep
  `?sslmode=require`, and restrict the DB's IP allow-list to Vercel's egress
  range (Neon/Supabase both support this). Never expose a non-TLS endpoint.
- **Least-privilege DB user.** Give the app a role scoped to its own schema
  rather than the superuser, where your provider allows it.
- **Object storage.** If you enable R2, use a scoped API token (object
  read/write on that bucket only), not an account-wide key.

---

## 7. Verify the deploy

From your machine, against the live URL:

```bash
# Key pages and the 404s
curl -o /dev/null -s -w '%{http_code}\n' https://karkana.setacore.com/            # 200
curl -o /dev/null -s -w '%{http_code}\n' https://karkana.setacore.com/module/basic # 200
curl -o /dev/null -s -w '%{http_code}\n' https://karkana.setacore.com/module/nope  # 404
curl -o /dev/null -s -w '%{http_code}\n' https://karkana.setacore.com/product/KRK999 # 404

# robots + sitemap resolve
curl -s https://karkana.setacore.com/robots.txt | head
curl -s https://karkana.setacore.com/sitemap.xml | head
```

Then sign in at `https://karkana.setacore.com/admin` with the operator you
created in step 2.

> The repo's `npm run smoke` script exercises the full API but **writes data**
> (it registers customers and places orders). Run it against a **preview**
> deployment or a staging database, not production:
> `SMOKE_ADMIN_USERNAME=… SMOKE_ADMIN_PASSWORD=… node scripts/smoke-test.mjs https://<preview-url>`.

---

## 8. After launch

- **Google Search Console** — verify the domain and submit
  `https://karkana.setacore.com/sitemap.xml`. `robots.txt` and the sitemap are
  already published and correct.
- **Backups** — enable point-in-time recovery / daily backups on Neon or
  Supabase, or schedule `pg_dump`.
- **Rotate** `KARKANA_SESSION_SECRET` and the admin password on a schedule;
  rotating the secret simply signs everyone out.
- **Analytics** — Vercel Analytics / Speed Insights are a one-toggle add if you
  want Core Web Vitals in the dashboard.

---

## 9. Quick reference — minimum viable production env

```
KARKANA_SITE_URL=https://karkana.setacore.com
KARKANA_SESSION_SECRET=<openssl rand -hex 32>
DATABASE_URL=postgres://…?sslmode=require
ADMIN_USERNAME=admin@setacore.com
ADMIN_PASSWORD_HASH=<npx tsx scripts/hash-password.ts '…'>
KARKANA_SUPPORT_EMAIL=info@setacore.com
KARKANA_CITY=Hyderabad
KARKANA_MIN_ORDER=530
```

Everything else has a working default in `src/infra/config.ts` /
`src/infra/env.ts`.
