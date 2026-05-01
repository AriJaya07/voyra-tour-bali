---
title: 09 · Cron & Jobs
updatedAt: 2026-05-01
---

# 09 · Cron & Scheduled Jobs

## Goal

Every `/api/cron/*` endpoint authenticates with `Bearer ${CRON_SECRET}`, performs its idempotent side-effect, and returns a JSON summary safe to log. None opens a hole for unauthenticated callers.

## Surface area

| Route | Purpose |
|---|---|
| [auto-complete-bookings](../../app/api/cron/auto-complete-bookings/route.ts) | `CONFIRMED → COMPLETED` once `travelDate < now()` |
| [cleanup-booking-tokens](../../app/api/cron/cleanup-booking-tokens/route.ts) | Clear ticket tokens past retention |
| [cleanup-recently-viewed](../../app/api/cron/cleanup-recently-viewed/route.ts) | Delete `RecentlyViewedItem` rows older than 24 h |
| [abandoned-wishlist](../../app/api/cron/abandoned-wishlist/route.ts) | Marketing email to users with idle wishlist (gated by NotificationPref.marketingEmails) |
| [trip-anniversary](../../app/api/cron/trip-anniversary/route.ts) | "1-year ago you visited" outreach |
| [trip-reminders](../../app/api/cron/trip-reminders/route.ts) | T-1d trip reminder email |
| [nyepi-reminder](../../app/api/cron/nyepi-reminder/route.ts) | Nyepi (Day of Silence) heads-up to upcoming travelers |
| [volcano-alert](../../app/api/cron/volcano-alert/route.ts) | Push + email if Mt Agung / Batur status escalates |
| [weather-alert](../../app/api/cron/weather-alert/route.ts) | Severe weather notice for nearby travel dates |
| [viator-sync](../../app/api/cron/viator-sync/route.ts) | Pull modified bookings from Viator |
| [viator-products-sync](../../app/api/cron/viator-products-sync/route.ts) | Pull modified products |
| [viator-daily-sync](../../app/api/cron/viator-daily-sync/route.ts) | Daily reconciliation |

## Preconditions

- `CRON_SECRET` set.
- For Viator crons: `VIATOR_API_KEY` or mock mode.
- For email crons: SMTP creds, plus targeted users without `marketingEmails: false`.

---

## Test cases (apply to every cron)

### TC-09-01 — Auth required (every cron)

- **When** POST without bearer.
- **Then** `401 { error: "Unauthorized" }`. No side-effect.

### TC-09-02 — Wrong bearer rejected

- **When** POST with `Authorization: Bearer wrong`.
- **Then** `401`. No side-effect.

### TC-09-03 — Auth ok → 200 JSON summary

- **When** POST with correct bearer.
- **Then** `200 { message: "...", processed?: number, sent?: number, ... }`. Body is JSON, not HTML.

### TC-09-04 — Idempotent re-run

- **When** the same cron is hit twice in a row.
- **Then** the second run is a no-op (or makes only newly-eligible changes). For email crons, no double email per recipient.

### TC-09-05 — Non-POST methods rejected

- GET on a POST-only route → `405` (or 404 if not exported). Either is acceptable; never 500.

## Per-cron acceptance criteria

### `auto-complete-bookings`
- Side-effect: `Booking { status: CONFIRMED, travelDate: < now() }` → `COMPLETED`. Returns count.
- **Type**: Integration.

### `cleanup-booking-tokens`
- Side-effect: Tokens for bookings beyond retention cleared.

### `cleanup-recently-viewed`
- Side-effect: `RecentlyViewedItem.viewedAt < now() - 24h` deleted. See [05-personalization.md TC-05-07](./05-personalization.md).

### `abandoned-wishlist`
- Targets: users with ≥1 `WishlistItem` and no booking in last 7 d. Gated by `NotificationPref.marketingEmails !== false`. Writes one `EmailDelivery { type: "ABANDONED_WISHLIST" }` per email sent.

### `trip-anniversary`
- Targets: bookings whose `travelDate` was exactly 365 d ago. Email `type: "TRIP_ANNIVERSARY"`. Skipped if `marketingEmails === false`.

### `trip-reminders`
- Targets: confirmed bookings with `travelDate = tomorrow`. Email `type: "TRIP_REMINDER"`. Skipped if `tripReminders === false`.

### `nyepi-reminder`
- Targets: confirmed bookings with `travelDate ∈ Nyepi window`. Push + email. Push only fires if `web-push` lib + VAPID keys configured (else skipped quietly).

### `volcano-alert`
- Targets: confirmed bookings near volcano region during alert. Pulls upstream alert source (verify URL in route file) — gracefully no-op on upstream 5xx.

### `weather-alert`
- Same pattern; targets nearby active travel dates.

### `viator-sync`
- Calls `lib/services/viatorSyncService.ts`. Updates local Booking rows. Returns `{ processed }`.

### `viator-products-sync`
- Detects modified products. Returns `{ updated }`.

### `viator-daily-sync`
- Daily reconciliation; combines both. Long-running — has `AbortSignal.timeout(120_000)` per upstream call.

---

## Manual QA checklist

For each cron, in order:

```bash
curl -i -X POST http://localhost:3000/api/cron/<name> \
  -H "Authorization: Bearer $CRON_SECRET"
```

- [ ] Without bearer → `401`
- [ ] With bearer → `200` and JSON body
- [ ] Inspect server log — no stack traces
- [ ] Inspect side-effect (DB row, email captured by `jsonTransport`, push noop)
- [ ] Re-run within 1 min → still `200`, no double work

## Third-party / local response checklist

| Cron | External | Expect |
|---|---|---|
| `viator-sync` | Viator | `/bookings/modified-since` style endpoint returns array; ack call accepted |
| `viator-products-sync` | Viator | `/products/modified-since` endpoint |
| `volcano-alert` | upstream alert feed | shape per route file; treat 5xx as no-op |
| `weather-alert` | weather API | shape per route file |
| email crons | Brevo | `transporter.sendMail` resolves |
| push crons | web-push (optional) | `sendNotification` resolves; 410/404 → prune row |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Cron 500s on Vercel | unhandled promise; check Vercel logs | wrap in try/catch + return 500 explicitly |
| Same recipient gets duplicate emails | `EmailDelivery` not consulted before send | gate on `EmailDelivery.findFirst({ userId, type, sentAt: { gte: cutoff } })` |
| Cron runs locally but not on Vercel | cron not configured in dashboard | add cron with the schedule from [docs/environment.md §6](../docs/environment.md) |
| `viator-sync` returns 0 always | wrong cursor / wrong endpoint | verify with curl directly first |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

All `/api/cron/*` routes appear in output. Each is a Node-runtime route (no Edge).
