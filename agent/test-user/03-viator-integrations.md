---
title: 03 · Viator Integrations
updatedAt: 2026-05-01
---

# 03 · Viator Integrations

## Goal

Every Viator-touching surface returns the right shape: catalog browse, freetext search, product detail, availability check, redirect-only widget, and the periodic sync crons.

## Surface area

| Concern | File |
|---|---|
| Unified entry | [app/api/viator/route.ts](../../app/api/viator/route.ts) — `GET ?action=products|product_detail|search`, `POST ?action=availability|book` |
| Sub-routes | [app/api/viator/availability/route.ts](../../app/api/viator/availability/route.ts), [app/api/viator/booking/route.ts](../../app/api/viator/booking/route.ts), [app/api/viator/booking-questions/route.ts](../../app/api/viator/booking-questions/route.ts), [app/api/viator/cart/book/route.ts](../../app/api/viator/cart/book/route.ts), [app/api/viator/cart/hold/route.ts](../../app/api/viator/cart/hold/route.ts), [app/api/viator/checkout-session/route.ts](../../app/api/viator/checkout-session/route.ts), [app/api/viator/cancel-quote/route.ts](../../app/api/viator/cancel-quote/route.ts), [app/api/viator/cancel/route.ts](../../app/api/viator/cancel/route.ts), [app/api/viator/cancel-reasons/route.ts](../../app/api/viator/cancel-reasons/route.ts), [app/api/viator/exchange-rates/route.ts](../../app/api/viator/exchange-rates/route.ts), [app/api/viator/locations/route.ts](../../app/api/viator/locations/route.ts), [app/api/viator/logistics/location/search/route.ts](../../app/api/viator/logistics/location/search/route.ts), [app/api/viator/mock-booking/route.ts](../../app/api/viator/mock-booking/route.ts), [app/api/viator/[targetType]/route.ts](../../app/api/viator/%5BtargetType%5D/route.ts) |
| Service + client | [lib/services/viatorService.ts](../../lib/services/viatorService.ts), [lib/services/viatorSyncService.ts](../../lib/services/viatorSyncService.ts), [lib/api/](../../lib/api/) |
| Config | [lib/config/viator.ts](../../lib/config/viator.ts) |
| Mock data | [lib/viatorMock.ts](../../lib/viatorMock.ts) |
| Crons | [app/api/cron/viator-sync/route.ts](../../app/api/cron/viator-sync/route.ts), [app/api/cron/viator-products-sync/route.ts](../../app/api/cron/viator-products-sync/route.ts), [app/api/cron/viator-daily-sync/route.ts](../../app/api/cron/viator-daily-sync/route.ts) |
| UI | [app/v/[slug]/page.tsx](../../app/v/%5Bslug%5D/page.tsx), [app/detail/[slug]/page.tsx](../../app/detail/%5Bslug%5D/page.tsx), [components/viator/](../../components/viator/), [components/checkout/](../../components/checkout/) |

## Preconditions

- Either `VIATOR_API_KEY` is set OR `NEXT_PUBLIC_VIATOR_MOCK_BOOKING=true`. Default tests prefer mock mode for repeatability.
- `VIATOR_API_URL` set (`https://api.viator.com/partner` for sandbox).

---

## Test cases

### TC-03-01 — Products list (mock mode)

- **Given** `VIATOR_API_KEY` empty.
- **When** GET `/api/viator?action=products&page=1&count=10`.
- **Then** `200 { products: [...], totalCount: 1, page, count }`. The single product has `productCode: "VTR-BALI-1"`.

### TC-03-02 — Products list (live)

- **Given** key present.
- **When** GET as above.
- **Then** Viator's `/products/search` is called once with `filtering.destination = 98`. Cache populated for 5 min — second call within window does **not** hit upstream.

### TC-03-03 — Product detail merges pricing/flags from search

- **When** GET `/api/viator?action=product_detail&productCode=PRD123`.
- **Then** parallel calls: `GET /products/PRD123` + `POST /products/search?searchTerm=PRD123`. Final body merges `pricing`, `flags`, `duration` from the search hit when richer.

### TC-03-04 — Search freetext

- **When** GET `/api/viator?action=search&query=ubud&page=1&count=20`.
- **Then** `200 { products, totalCount, page, count, hasMore }`. Empty `query` → empty array, no upstream hit.

### TC-03-05 — Availability check

- **When** POST `/api/viator/availability` with `{ productCode, travelDate, paxMix }`.
- **Then** mock mode returns `{ available: true, slots: [...], _mock: true }`. Live calls hit `/availability/check` with `AbortSignal.timeout(120_000)`.
- Missing `productCode` → `400`.

### TC-03-06 — Booking via `?action=book` writes local DB even if upstream fails

- **Given** signed-in user, `VIATOR_API_KEY` valid.
- **When** POST `/api/viator?action=book`.
- **Then** if upstream throws, `Booking.bookingRef` is `LOCAL-…`. If it succeeds, `bookingRef` is the upstream ref. Either way, status persisted as `PENDING`.

### TC-03-07 — Redirect-only widget

- **Given** the redirect-only Viator widget is the canonical funnel for catalog tours.
- **When** the user clicks "Book on Viator" on `/v/[slug]` or detail.
- **Then** they are sent off-site with `?pid=$NEXT_PUBLIC_VIATOR_PARTNER_ID`. No callback to Voyra. There is **no** `viator-confirm` postMessage handler — confirmation comes via the cron sync OR via the `ImportedTrip` paste flow ([07-itineraries-and-trips.md](./07-itineraries-and-trips.md)).

### TC-03-08 — Cron `viator-sync` pulls modified bookings

- **When** POST `/api/cron/viator-sync` with bearer.
- **Then** `200 { message, processed: N }`. Local Booking rows whose `viatorBookingRef` matches a "modified" upstream record are updated. Without bearer → `401`.

### TC-03-09 — Cron `viator-products-sync` detects modified products

- Same auth pattern. `200` even when 0 changes.

### TC-03-10 — Outbound timeout protection

- All `axios.post`/`fetch` calls in the route handlers use a 120 s timeout. Forge an upstream that hangs → route returns `502` (or `{ products: [], warning }` — depending on action) and does not block the worker forever.

### TC-03-11 — 401/403 from Viator → graceful fallback

- **When** upstream returns `401` (rotated key) on `?action=products`.
- **Then** route returns `200 { products: [], totalCount: 0, warning: "Viator API unavailable — showing local data only" }`. UI still renders (empty grid).

### TC-03-12 — `viator/[targetType]` proxy passes through

- Every targetType under [app/api/viator/[targetType]/route.ts](../../app/api/viator/%5BtargetType%5D/route.ts) maintains the timeout + error shape.

---

## Manual QA checklist

- [ ] Homepage hero loads with Viator products visible (or mock data if no key)
- [ ] Search bar with "ubud" returns at least 1 result
- [ ] Click a product → `/detail/[slug]` renders with rating, price, duration
- [ ] Hit `/api/viator?action=products` from the network tab — second call within 5 min returns from cache (verify same `totalCount`, no upstream POST in server log)
- [ ] Click "Book" → redirect to `viator.com/...?pid=…`
- [ ] Trigger `/api/cron/viator-sync` with bearer → 200 + processed count
- [ ] Rotate the `VIATOR_API_KEY` to a wrong value → app degrades gracefully (empty grid + console warning, no 500 to the browser)

## Third-party / local response checklist

| Endpoint | Shape |
|---|---|
| `POST {VIATOR_API_URL}/products/search` | `{ products: ProductSummary[], totalCount: number }` |
| `GET {VIATOR_API_URL}/products/{code}` | full product schema (description, inclusions, exclusions, itinerary, …) |
| `POST {VIATOR_API_URL}/availability/check` | `{ available, bookableItems[{itemCode, totalPrice{price{recommendedRetailPrice}}}] }` |
| `POST {VIATOR_API_URL}/bookings/book` | `{ orderId, bookingRef, status }` |
| Local mock | matches the keys above 1:1; gated via `USE_MOCK_DATA` in [app/api/viator/route.ts](../../app/api/viator/route.ts) |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Empty products everywhere | bad `VIATOR_API_KEY`, or destination ID changed (Bali = 98) | rotate; verify destination id |
| `Accept-Currency` ignored | header missing on detail call | add `Accept-Currency: ${currency}` (already in current code) |
| Cache shows stale prices | 5-min TTL | tune `CACHE_TTL` if needed; do not nuke the cache for a single user |
| Cron runs but processes 0 | upstream hasn't published changes since last cursor | normal; verify by forcing a modification |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

All `app/api/viator/**` routes present in output. `app/v/[slug]` and `app/detail/[slug]` build cleanly.
