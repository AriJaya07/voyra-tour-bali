---
title: 05 · Personalization
updatedAt: 2026-05-01
---

# 05 · Personalization

## Goal

User-scoped state (wishlist, recently-viewed, currency, travel profile, calendar) survives reload from the **DB**, never from `localStorage`. Currency change reflects across the app. Recently-viewed expires after 24 h.

## Surface area

| Concern | File |
|---|---|
| Wishlist API | [app/api/wishlist/route.ts](../../app/api/wishlist/route.ts) |
| Wishlist UI | [app/wishlist/page.tsx](../../app/wishlist/page.tsx), [components/common/WishlistButton.tsx](../../components/common/WishlistButton.tsx) |
| Wishlist store | [utils/hooks/useWishlist.ts](../../utils/hooks/useWishlist.ts) (no `persist` middleware — DB-only by design) |
| Sync provider | `WishlistProvider`, `RecentlyViewedSync`, `CurrencySync`, `PreferencesSync` (under [components/providers/](../../components/providers/)) |
| Recently-viewed API | [app/api/recently-viewed/route.ts](../../app/api/recently-viewed/route.ts) |
| Recently-viewed cron sweep | [app/api/cron/cleanup-recently-viewed/route.ts](../../app/api/cron/cleanup-recently-viewed/route.ts) |
| Currency | [utils/hooks/useCurrency.ts](../../utils/hooks/useCurrency.ts), `User.currency` column |
| User preferences | [app/api/profile/route.ts](../../app/api/profile/route.ts), `UserPreferences` model |
| Travel profile | [app/profile/travel-profile/page.tsx](../../app/profile/travel-profile/page.tsx) |
| Calendar | [app/profile/calendar/page.tsx](../../app/profile/calendar/page.tsx) |
| Models | `WishlistItem`, `RecentlyViewedItem`, `UserPreferences`, `User.currency` |

## Preconditions

- Signed-in user. (Most personalization is gated by `getServerSession`.)
- DB-only persistence rule: zero `voyra_*` keys in `window.localStorage` after sign-in.

---

## Test cases

### TC-05-01 — Add to wishlist persists in DB only

- **Given** signed-in user with empty wishlist.
- **When** click ❤ on a product card.
- **Then** POST `/api/wishlist` `{ productCode, source, title, imageUrl, href, priceAtSave }` returns `201` (or `200` with toggle off). New `WishlistItem { userId, productCode, source }`. No `voyra_wishlist` key in localStorage.

### TC-05-02 — Wishlist page lists DB rows

- GET `/wishlist`. Hydrated cards match DB rows. `savedAt` driven labels: "Saved today / yesterday / Nd ago". Cards have **no price** and consistent `h-[220px]` per the user's directive.

### TC-05-03 — Remove from wishlist

- DELETE `/api/wishlist?productCode=...&source=...` → row gone, page reflects after invalidation.

### TC-05-04 — Wishlist remains empty after sign-out

- Sign out → wishlist store empties. No localStorage residue. Sign back in → wishlist re-hydrates from DB.

### TC-05-05 — Recently-viewed upserts on tour detail visit

- **When** user lands on `/detail/<productCode>`.
- **Then** POST `/api/recently-viewed` `{ productCode, source, title, imageUrl }` upserts a `RecentlyViewedItem`. `viewedAt = now()`.

### TC-05-06 — Recently-viewed 24 h TTL

- **Given** `RecentlyViewedItem.viewedAt = -25h`.
- **When** GET `/api/recently-viewed`.
- **Then** that row is filtered out. The route also deletes rows older than 24 h opportunistically.

### TC-05-07 — Cron sweep clears stale rows

- **When** POST `/api/cron/cleanup-recently-viewed` with bearer.
- **Then** `200`. All `RecentlyViewedItem` rows older than 24 h removed. Without bearer → `401`.

### TC-05-08 — Currency switch persists to `User.currency`

- **When** user picks `IDR → USD` from the navbar dropdown.
- **Then** PATCH `/api/profile` `{ currency: "USD" }`. `User.currency = "USD"`. Reload page → still USD. No localStorage.

### TC-05-09 — Currency conversion uses Viator exchange-rates

- Detail page price re-renders in chosen currency. Hits [app/api/viator/exchange-rates/route.ts](../../app/api/viator/exchange-rates/route.ts).

### TC-05-10 — Travel profile saved

- POST/PATCH `/api/profile` with `{ preferences: { interests: ["surf","food"], travelStyle: "BUDGET" } }`. `UserPreferences` upserted. Reload `/profile/travel-profile` → form pre-fills.

### TC-05-11 — Calendar shows confirmed bookings

- GET `/profile/calendar`. Renders react-calendar. Days with `Booking { status: CONFIRMED, travelDate }` are dotted. Click a date → list of trips on that day.

### TC-05-12 — `RecentlyViewedStrip` empty fallback

- Component on home or wishlist shows nothing if fewer than `minItems`. No "you have nothing" placeholder when count = 0 unless explicitly set.

---

## Manual QA checklist

- [ ] Heart a product → reload → still hearted
- [ ] Inspect `Application > Local Storage` — **no** `voyra_*` keys
- [ ] Sign out → heart disappears (no leftover state)
- [ ] Sign back in → wishlist reappears
- [ ] Visit 5 tours → /wishlist shows "Pick up where you left off" strip
- [ ] Wait 24+ h (or set `viewedAt` manually back) → strip empties; cron sweep clears DB rows
- [ ] Change currency to USD → all prices reflect; reload keeps it
- [ ] Update travel profile interests → persists across logout
- [ ] `/profile/calendar` dots upcoming confirmed bookings

## Third-party / local response checklist

| Surface | Provider | Expect |
|---|---|---|
| `WishlistItem` | local | `{ id, userId, productCode, source, title, imageUrl, href, priceAtSave?, savedAt }` |
| `RecentlyViewedItem` | local | `{ id, userId, productCode, source, title, imageUrl, viewedAt }` (no rows older than 24 h after sweep) |
| Exchange rates | Viator | `{ rates: { USD: 1, IDR: 15800, ... } }` (matches the actual route shape) |
| `User.currency` | local | ISO 4217 code, `IDR | USD | EUR | GBP | AUD | SGD | JPY` |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Wishlist resets on reload | `useWishlistStore` accidentally re-added `persist` middleware | strip `persist`, sync only via provider |
| `/wishlist` shows 0 but DB has rows | `useWishlistStore.hydrated` never flips true | confirm `WishlistProvider` sets it after fetch |
| Currency reverts to IDR after refresh | `User.currency` not patched | inspect network for failed PATCH |
| Recently-viewed never clears | cron not running, or `viewedAt` typo | trigger cron manually; confirm column name |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

`/wishlist`, `/profile/calendar`, `/profile/travel-profile`, `/api/wishlist`, `/api/recently-viewed`, `/api/cron/cleanup-recently-viewed` all in build output.
