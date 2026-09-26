# Karkana — Design System v2 ("Obsidian & Ember")

**Identity is kept.** Pure black, signal red `#FF0033`, all-caps technical typography,
sharp corners. What changes is that v1's one-off Tailwind classes become a **token system**,
and the layouts stop hardcoding catalogue facts.

---

## 1. Principles

1. **Black is the material, red is the signal.** Red is never decorative — it marks
   price, action, state, or the live cursor. A screen with red everywhere has said nothing.
2. **One accent per view.** Each page has exactly one primary action styled as a solid
   white or red block. Everything else is outlined or ghost.
3. **Data, not copy.** Counts, ranges, module names and availability come from the
   catalogue. No string in the UI asserts a number the database did not supply.
4. **Density is the aesthetic.** Hairline borders (`1px`, 8% white) instead of shadows;
   monospace for data, sans for voice.
5. **Motion is short and mechanical.** 120–200 ms, `cubic-bezier(.16,1,.3,1)`. Nothing bounces.

---

## 2. Tokens (Tailwind v4 `@theme`, `src/app/globals.css`)

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--color-void` | `#000000` | Page background |
| `--color-panel` | `#0a0a0b` | Cards, table rows, inputs |
| `--color-panel-raised` | `#121214` | Hover, active rows, dialogs |
| `--color-hairline` | `rgba(255,255,255,.09)` | Default 1px borders |
| `--color-hairline-strong` | `rgba(255,255,255,.18)` | Emphasised borders, inputs |

### Accent (ember)
| Token | Value | Use |
|---|---|---|
| `--color-ember` | `#FF0033` | Brand red — price delta, primary CTA, active nav |
| `--color-ember-hover` | `#E5002D` | Hover on solid red |
| `--color-ember-press` | `#B30024` | Active/pressed |
| `--color-ember-wash` | `rgba(255,0,51,.10)` | Tinted panels (personalization, errors) |
| `--color-ember-glow` | `0 0 24px rgba(255,0,51,.22)` | Live indicators only |

### Text
| Token | Value | Use |
|---|---|---|
| `--color-fg` | `#ffffff` | Headlines, prices |
| `--color-fg-muted` | `rgba(255,255,255,.66)` | Body copy (≥ 4.6:1 on `#000`) |
| `--color-fg-dim` | `rgba(255,255,255,.40)` | Labels, meta, mono captions |
| `--color-fg-ghost` | `rgba(255,255,255,.18)` | Disabled, oversized numerals |

### Status
`--color-status-ok #35D07F` · `--color-status-warn #FFB020` · `--color-status-danger #FF0033`
· `--color-status-info #6EA8FF`

### Geometry
| Token | Value |
|---|---|
| `--radius-none` | `0` (default — the identity) |
| `--radius-xs` | `2px` (chips, badges) |
| `--radius-sm` | `4px` (inputs, buttons) |
| `--radius-full` | `999px` (status dots, pills) |

### Type scale (Geist Sans / Geist Mono)
| Role | Size / tracking | Weight |
|---|---|---|
| `display` | `clamp(2.5rem, 7vw, 6rem)` / `-0.02em` | 800 |
| `h1` | `clamp(1.75rem, 4vw, 3rem)` / `0.01em` | 700 |
| `h2` | `1.25rem → 2.25rem` / `0.08em` upper | 700 |
| `h3` | `0.9375rem` / `0.06em` upper | 700 |
| `body` | `0.9375rem` / `0` | 400 |
| `label` | `0.6875rem` / `0.14em` upper | 500, mono |
| `data` | `0.8125rem` / `0.04em` | 500, mono, tabular-nums |

`font-variant-numeric: tabular-nums` is mandatory on every price and count.

### Motion
`--ease-expo: cubic-bezier(.16,1,.3,1)` · `--duration-fast: 120ms` ·
`--duration-base: 200ms` · `--duration-slow: 320ms`.
Honour `@media (prefers-reduced-motion: reduce)` → all durations `0.01ms`.

---

## 3. Components (`src/ui`)

| Component | Variants | Notes |
|---|---|---|
| `Button` | `solid` `ember` `outline` `ghost` `danger`; `sm md lg`; `block` | `disabled` = 40% opacity + `cursor-not-allowed`; min height 40/44/52 |
| `Badge` | `neutral` `ember` `ok` `warn` `danger` `outline` | mono, uppercase, `radius-xs` |
| `Card` | `flat` `raised` `interactive` | 1px hairline; `interactive` lifts border to `hairline-strong` |
| `Field` | wraps label + control + `error` + `hint` | label = `label` token, error in `ember` |
| `Input` `Textarea` `Select` | — | `bg-panel`, 1px `hairline-strong`, focus → `ember` border + 2px ring |
| `Table` | — | hairline row separators, sticky header, `data` type in cells |
| `Tabs` | `underline` `segment` | `aria-selected`, arrow-key navigation |
| `Skeleton` | — | `panel-raised` shimmer, 1.4s |
| `EmptyState` | — | hairline rule + title + copy + optional action |
| `Price` | `sm md lg` | `formatINR`, optional strike-through MRP + `−xx%` in ember |
| `QuantityStepper` | — | −/+ buttons 44px, `inputMode=numeric` |
| `Drawer` | — | mobile nav; focus trap, `Esc` closes, scroll lock |
| `Toast` | `ok` `danger` `info` | `role=status` / `role=alert`, 4s auto-dismiss |
| `ProductCard` | `grid` `row` | image in a 1:1 `object-contain` well, badges top-left |
| `SectionHeader` | — | `[01]` index + hairline + title + subtitle |

Every component takes `className` and merges through `cn()` (`clsx` + `tailwind-merge`).

---

## 4. Layout rules

* Container: `max-w-7xl`, `px-4 sm:px-8 lg:px-12`.
* Vertical rhythm: sections `py-16 sm:py-28`.
* Grid: products `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` (v1 used CSS `columns`, which
  breaks reading order for keyboard and screen-reader users — replaced).
* Product image well: square, `object-contain`, `p-4 sm:p-8`, never cropped, never stretched.
* Sticky header 64px (mobile) / 80px (desktop), `bg-void/85` + `backdrop-blur`.
* Mobile bottom bar on cart/checkout/product pages: total + primary action, always visible.
* Focus ring: `outline-none ring-2 ring-ember ring-offset-2 ring-offset-void` on every
  interactive element. Never `outline: none` without a replacement.

---

## 5. Page-by-page intent

| Page | Change from v1 |
|---|---|
| Home | Hero copy is static; **module cards are generated from live counts** and hidden when a module has no visible products. Popular/Featured sections render only when non-empty. |
| Module | Real filters (category, price band, in-stock), sort, and a count that comes from the query. |
| Product | Sticky buy panel on desktop; personalization upload only for `PERSONALIZED`; specs table; "added" state moves to a Toast. |
| Search | Instant results + empty state that suggests modules; query in the URL. |
| Cart | Lines carry a server-verified unit price; quantities update through the store; empty state links to modules. |
| Checkout | Two-column: form + live summary. Server recomputes totals; client shows what the server will charge. |
| Order | Status timeline driven by `ORDER_TRANSITIONS`; guest lookup by order id; account users see history. |
| Account | New: overview, orders, addresses, wishlist. |
| Admin | Same dark language, but `Table`/`Tabs`/`Field` primitives; legal status transitions only; validation panel driven by the validation service. |

---

## 6. Accessibility & performance

* Contrast: body copy `fg-muted` on `void` = **4.6:1**; `fg-dim` is reserved for
  non-essential labels at ≥ 11px equivalent.
* Landmarks: `header`, `nav`, `main`, `footer`; one `h1` per page.
* Images: `next/image` with known `width`/`height` from `image_width`/`image_height`;
  `priority` for the first four cards above the fold.
* Fonts: `next/font/local` (Geist + Geist Mono), `display: swap`, no layout shift.
* No third-party scripts. Bundle keeps `pg`, `@aws-sdk/client-s3` and all of `core/infra`
  strictly server-side (imported only from RSC, route handlers and Server Actions).
