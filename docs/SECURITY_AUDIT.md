# Security Audit (VAPT) Report

Scope: the Karkana storefront and admin control centre in this repository.
Date of review: 27 September 2026.

This document works through a standard 31-point web VAPT checklist. Items are
grouped as **Fixed** (a real defect was found and corrected), **Verified clean**
(the control was already present and was confirmed by reading the code and/or
exercising the running app), and **Not applicable** (the feature the item
targets does not exist in this application, so there is nothing to test).

Nothing here is aspirational. Where a control could not be exercised in this
environment, that is stated rather than assumed.

---

## 1. Fixed

### 1.1 Path traversal in the upload storage adapter

`src/infra/storage/index.ts` guarded upload keys with a bare
`target.startsWith(LOCAL_ROOT)` prefix check. That is a classic near-miss:
`/app/public/uploads-secret/evil.txt` begins with the string
`/app/public/uploads` without being inside that directory at all, so a sibling
directory qualified as "inside the root".

A second defect was found while writing the regression test. The old code also
stripped leading `../` segments with a regex and then wrote the remainder, so
`../../../etc/passwd` was silently **rewritten** to
`<root>/etc/passwd` rather than rejected. That is not an escape, but it is not
a rejection either: a traversal attempt quietly wrote to a mangled path that
could collide with a legitimate upload.

The guard now lives in two exported, unit-tested functions:

- `sanitizeUploadKey(key)` — rejects empty/non-string keys, absolute paths,
  Windows drive letters, NUL bytes, and **any** `..` segment in either
  separator style. It refuses rather than rewrites.
- `resolveUploadPath(key, root)` — resolves and then compares against the root
  **with a trailing separator**, so sibling directories cannot qualify.

Coverage: `src/infra/storage/__tests__/upload-path.test.ts` (8 tests),
including traversal depths 1 through 8 and the sibling-prefix regression.

Reachability note: upload keys are currently server-generated
(`${folder}/${Date.now()}_${randomBytes(6).hex}.${ext}`) with no user-controlled
path component, so this was a latent flaw rather than one reachable today. It is
fixed because the adapter is the natural place for that assumption to break.

### 1.2 Stored XSS via the JSON-LD block

`src/app/product/[id]/page.tsx` rendered structured data through
`dangerouslySetInnerHTML` using raw `JSON.stringify`. `JSON.stringify` does
**not** escape `<`, `>`, `&`, U+2028 or U+2029, so a product name containing
`</script>` closed the surrounding script element and everything after it was
parsed as markup. Product names are admin-controlled, so this was a stored XSS
reachable by anyone with admin access (or via a compromised admin account).

Serialisation moved to `toSafeJsonLd()` in `src/infra/seo/json-ld.ts`, which
escapes those characters to `\uXXXX`. The JSON is byte-identical when parsed.

Coverage: `src/infra/seo/__tests__/json-ld.test.ts` (8 tests) asserts no raw
`<`, `>`, `&`, U+2028 or U+2029 survives, that the payload still round-trips
through `JSON.parse`, and that a hostile product name yields exactly one
`</script>` in the rendered element.

### 1.3 No rate limiting on any authentication route

There was no rate limiting anywhere in the application. Login, admin login and
registration could be called without bound, which permits credential brute
force, password spraying and mass account creation.

Added `src/infra/auth/rate-limit.ts`: a per-process fixed-window limiter that
sweeps expired buckets every 60 seconds and keys on
`clientKey(request, scope)`, derived from `X-Forwarded-For` (first entry),
falling back to `X-Real-IP`. Presets in `AUTH_LIMITS`:

| Scope         | Limit         |
| ------------- | ------------- |
| `login`       | 10 / 10 min   |
| `register`    | 5 / hour      |
| `adminLogin`  | 5 / 15 min    |

Wired into `/api/v1/auth/login`, `/api/v1/auth/admin/login` and
`/api/v1/auth/register`. Blocked requests return `429` with a `Retry-After`
header; `fail()` in `src/infra/http.ts` gained a fifth `headers?` parameter to
carry it. A successful sign-in clears its bucket via `clearRateLimit()`.

Verified live: 12 rapid login attempts against the running server returned
`401` ten times, then `429` twice, with `retry-after: 590`.

Coverage: `src/infra/auth/__tests__/rate-limit.test.ts` (11 tests), including
that one IP cannot lock out another, that scopes are independent, and that the
window reopens after it elapses.

Known limitation: the limiter is **per process**. Behind more than one instance
each replica keeps its own counters, so the effective limit is
`limit x instances`. A shared store (Redis) is required to make it global. This
is recorded rather than silently accepted.

### 1.4 Missing Content Security Policy

No CSP was sent. Added `src/infra/http/security-headers.ts` and wired it into
`src/proxy.ts`. The policy is generated per request with a fresh
`crypto.randomUUID()` nonce:

```
default-src 'self';
script-src 'self' 'nonce-<nonce>' 'strict-dynamic' ['unsafe-eval' in dev only];
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: [configured storage/CDN hosts];
font-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'self';
[upgrade-insecure-requests when x-forwarded-proto is https]
```

`script-src` carries no `'unsafe-inline'`, so injected markup cannot execute.
`'unsafe-eval'` is present only in development, where React uses `eval` for
richer error stacks.

`style-src` deliberately allows `'unsafe-inline'` because React renders inline
`style` attributes (three dynamic progress-bar widths in the admin screens) and
inline style attributes cannot carry a nonce. CSS cannot execute script, so the
residual risk is cosmetic, not an execution primitive.

Verified live in a single request: the nonce in the `Content-Security-Policy`
header matched the nonce attribute on the emitted script, and the count of
inline `<script>` elements without a nonce was **0**. All 43 smoke checks pass
with the CSP active.

Coverage: `src/infra/http/__tests__/security-headers.test.ts` (11 tests).

### 1.5 Missing HTTP Strict Transport Security

No HSTS header was sent. `buildHstsHeader()` now emits
`max-age=31536000; includeSubDomains`, and `src/proxy.ts` sets it **only** when
`x-forwarded-proto` is `https`. Sending HSTS over plain HTTP is ignored by
browsers and can poison a later TLS deployment, so the conditional is the point.

### 1.6 Sitemap contradicted robots.txt

`src/app/sitemap.ts` advertised `/cart`, `/account/login` and
`/account/register`, all of which `robots.txt` disallows. Advertising a URL in
the sitemap while blocking it in robots is a signal conflict that wastes crawl
budget. The sitemap now lists only indexable routes.

Verified live: 145 URLs, of which 138 are product pages, and zero matches for
`/cart`, `/account`, `/checkout`, `/thank-you` or `/admin`. No duplicates.

---

## 2. Verified clean

Each entry below was checked against the code and, where practical, against the
running application.

| Item | Finding |
| --- | --- |
| **SQL injection** | All queries go through Drizzle ORM's parameterised API. The only `sql` template literal in the codebase is a constant regex `^KRK[0-9]+$` used to match order ids; no user input is interpolated into SQL anywhere. |
| **DOM-based XSS** | Exactly one `dangerouslySetInnerHTML` in `src/` (the JSON-LD block, now escaped). No `innerHTML`, `outerHTML`, `eval`, `new Function`, `document.write` or `insertAdjacentHTML` anywhere in `src/`. |
| **CSRF** | All 19 API routes were enumerated with their verbs. Every state-changing operation is POST, PATCH or DELETE; there is no state-changing GET. Session cookies are `SameSite=lax`, and no route sets permissive CORS, so cross-origin form/fetch cannot carry the session. |
| **Clickjacking** | `X-Frame-Options: SAMEORIGIN` is set globally in `next.config.ts`, reinforced by CSP `frame-ancestors 'self'`. |
| **MIME sniffing** | `X-Content-Type-Options: nosniff` present on all routes. |
| **CORS** | No `Access-Control-Allow-*` header appears anywhere in the codebase, so the API is same-origin only. |
| **OS command injection** | No `child_process`, `exec`, `execSync`, `spawn` or `execFile` in `src/`. Nothing reaches a shell. |
| **Prototype pollution** | No `Object.assign` or spread of untrusted `JSON.parse` output, no `__proto__` or `constructor[` access. Inputs are validated through Zod schemas before use, which yields plain typed objects. |
| **Access control** | `src/proxy.ts` performs only optimistic redirects. The authoritative checks are in `src/infra/auth/guards.ts` (`requireAdmin`, `requireCustomer`, `requireAdminPage`, `requireCustomerPage`) and are called in every protected route handler, Server Action and admin layout. Order reads go through `OrderViewer = guest \| customer \| admin`, so a customer cannot read another customer's order (`FORBIDDEN`). |
| **Authentication** | PBKDF2-HMAC-SHA256 at 210,000 iterations with a 16-byte random salt, compared with `timingSafeEqual`. Sessions are stateless HMAC-SHA256 tokens with an `exp` claim and a per-session random `sid`. The session secret is **fatal if missing in production** rather than falling back to a default. |
| **Cookie hardening** | `httpOnly`, `SameSite=lax`, `secure` in production, `path=/`. Customer sessions last 30 days, admin sessions 12 hours. |
| **Session token verification** | `verifySession()` uses `timingSafeEqual` on the signature, length-checks first, validates `exp`, and rejects any `role` other than `admin`/`customer`. |
| **Information disclosure** | API failures return `{success:false, error, code, issues?}` with a generic message for unexpected errors. Stack traces are not returned to clients. `poweredByHeader: false` removes the `X-Powered-By` header. Admin, account, checkout, cart, thank-you and API routes are all `noindex`. |
| **Basic login vulnerabilities** | Now rate limited (1.3). Passwords enforce a minimum length plus lower, upper and digit classes. Login accepts any password shape so the response cannot leak the password policy. |
| **File upload** | `MAX_BYTES = 10 MB`; four allowed image MIME types mapped to extensions; `kind` is `product` (requires `await requireAdmin()`) or `personalization`; returns 400/413/415 on empty, oversized and wrong-type payloads. Keys are server-generated, so no user input reaches the path. Local-disk storage is refused in production. |
| **HTTP host header attacks** | The `Host` header is read only to detect `admin.*` subdomains for a rewrite; it is never reflected into output, links or redirects. Redirects are built from `request.url`/`request.nextUrl`, not from raw header values. |
| **Race conditions** | Order ids are generated server-side and uniqueness is enforced by the store. Checkout sends only ids and quantities; the server recomputes totals with `priceOrder`, so a client cannot influence price. Status transitions go through an explicit state machine that returns `409 ILLEGAL_TRANSITION`, so concurrent transitions cannot produce an invalid state. |
| **API testing** | `scripts/smoke-test.mjs` exercises the API end to end: **43 checks, 0 failures**. Confirmed contracts include `pageSize` capped at 96 (422 above), `?module=NOPE` returning 422, anonymous `/account` and `/admin` returning 307, and unauthenticated admin mutations returning 401. |
| **Insecure deserialization** | No Java/PHP-style object deserialization, no `node-serialize`, no `eval` of stored data. Persisted state is JSON parsed through Zod schemas. |

---

## 3. Not applicable

These checklist items target functionality that does not exist in this
application, so there is no attack surface to test. They are recorded as
skipped rather than passed.

| Item | Why it does not apply |
| --- | --- |
| **XXE** | No XML parsing. All payloads are JSON. |
| **SSRF** | The server never fetches a caller-supplied URL. Outbound HTTP goes only to configured object-storage endpoints read from environment variables. |
| **HTTP request smuggling** | No custom HTTP parsing or reverse proxy layer in this codebase; the app sits behind a standard Next.js server. |
| **SSTI** | No server-side template engine. Rendering is React JSX, which does not evaluate interpolated strings as code. |
| **WebSockets** | None. All communication is HTTP request/response. |
| **OAuth** | Not implemented. Authentication is first-party email/password only. |
| **GraphQL** | Not implemented. The API is REST under `/api/v1/*`. |
| **NoSQL injection** | No NoSQL datastore. Persistence is PostgreSQL (Drizzle) or a JSON file. |
| **JWT vulnerabilities** | Sessions are not JWTs. They are purpose-built stateless HMAC-SHA256 tokens with a fixed payload shape, so the JWT-specific classes (`alg: none`, algorithm confusion, `kid` injection, header-controlled verification) have no analogue here. |
| **Web LLM attacks** | No LLM integration. No prompt handling, tool calling or model output reaches the page. |
| **Web cache deception** | No CDN or shared cache layer is configured in this codebase. Authenticated pages are `noindex` and rendered dynamically. This should be re-tested at the edge once a CDN is introduced. |
| **Web cache poisoning** | No cache key manipulation is possible from the app: no caching layer is configured, and no unkeyed header (including `Host` and `X-Forwarded-*`) is reflected into cached output. Re-test when a CDN is added. |

---

## 4. Open items and residual risk

Recorded honestly rather than closed out.

1. **Rate limiting is per process.** With more than one instance the effective
   limit multiplies by the instance count. Move the counters to Redis (or
   equivalent) before scaling out horizontally.
2. **Registration discloses account existence.** A duplicate email returns
   `409 EMAIL_TAKEN`, which allows user enumeration. This is a deliberate UX
   trade-off and is partially mitigated by the 5-per-hour registration limit.
   Returning a uniform "check your inbox" flow would remove the signal at the
   cost of immediate feedback.
3. **Uploads are not validated by magic bytes.** The MIME type is trusted and
   mapped to an extension. `nosniff` plus the extension mapping limits the
   impact, but content sniffing would be a stronger control.
4. **`style-src 'unsafe-inline'`.** Required by React's inline `style`
   attributes. Cosmetic risk only; not an execution primitive.
5. **HSTS and `upgrade-insecure-requests` are conditional on TLS.** They are
   inert until the deployment terminates HTTPS and forwards
   `x-forwarded-proto`. Confirm both appear in production headers after deploy.

---

## 5. Environment limitations

These could not be exercised here, and are stated as unverified rather than
passed:

- **PostgreSQL adapter and `scripts/seed.ts`** — no local Postgres or Docker.
  All runtime verification used the JSON adapter via `KARKANA_DB_PATH`.
- **Core Web Vitals and visual mobile QA** — no Chromium or Puppeteer
  available. Mobile work was verified by markup, tokens and responsive
  utilities, not by rendered measurement.
- **Multi-instance rate limiting** — requires more than one running process and
  a shared store.

---

## 6. Reproducing these results

```bash
npm ci
npm run typecheck   # 0 errors
npm run lint        # 0 errors
npm run test        # 121 passed, 11 files
npm run build       # 45 routes + proxy (2 static, 43 dynamic)
npm run smoke       # 43 passed, 0 failed (needs the dev server on :3000)
```

The security-specific regression tests are:

```bash
npx vitest run src/infra/storage src/infra/seo src/infra/http src/infra/auth
# upload-path 8 · json-ld 8 · security-headers 11 · rate-limit 11 · auth 16 = 54
```

Note for local runs: without `KARKANA_SESSION_SECRET` the dev server generates
an **ephemeral per-module-instance** secret. Turbopack gives route handlers and
Server Components separate module instances, so the page guard cannot verify a
token the API signed and `/account` returns 307 while
`/api/v1/auth/session` returns 200. Set `KARKANA_SESSION_SECRET` in
`.env.local` to get consistent sessions in development.
