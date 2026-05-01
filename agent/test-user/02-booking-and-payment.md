---
title: 02 · Booking & Payment
updatedAt: 2026-05-01
---

# 02 · Booking & Payment

## Goal

Money path. From "I want to book" to "ticket landed in inbox" without dropping a row, double-charging, or trusting the client. Covers Midtrans Snap, the webhook, post-payment side-effects (ticket + Viator confirm + email + loyalty + referral conversion).

## Surface area

| Concern | File |
|---|---|
| Local booking POST | [app/api/bookings/local/route.ts](../../app/api/bookings/local/route.ts) |
| Bookings list | [app/api/bookings/route.ts](../../app/api/bookings/route.ts) (also auto-cleans expired pendings + pulls Viator status) |
| Booking detail | [app/api/bookings/[bookingRef]/route.ts](../../app/api/bookings/%5BbookingRef%5D/route.ts) (if present — fall back to PATCH on /api/bookings) |
| Mock booking | [app/api/viator/mock-booking/route.ts](../../app/api/viator/mock-booking/route.ts) |
| Snap-token issue | [lib/services/midtransService.ts](../../lib/services/midtransService.ts), [lib/config/midtrans.ts](../../lib/config/midtrans.ts) |
| Webhook | [app/api/payment/notification/route.ts](../../app/api/payment/notification/route.ts) |
| Post-payment | [lib/services/postPaymentService.ts](../../lib/services/postPaymentService.ts) |
| Booking service | [lib/services/bookingService.ts](../../lib/services/bookingService.ts) |
| Local fallback | [lib/services/localBookingService.ts](../../lib/services/localBookingService.ts) |
| Ticket page | [app/ticket/[token]/page.tsx](../../app/ticket/%5Btoken%5D/page.tsx), [lib/ticket.ts](../../lib/ticket.ts) |
| Cleanup cron | [app/api/cron/auto-complete-bookings/route.ts](../../app/api/cron/auto-complete-bookings/route.ts), [app/api/cron/cleanup-booking-tokens/route.ts](../../app/api/cron/cleanup-booking-tokens/route.ts) |
| Models | `Booking`, `BookingTraveler`, `MockBooking`, `LoyaltyAccount`, `LoyaltyLedger`, `Referral`, `EmailDelivery` |

## Preconditions

- All Midtrans env set (server + client + `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false`).
- Webhook URL configured in Midtrans dashboard to point at your tunnel (use `ngrok http 3000`) when testing real notifications, OR run **TC-02-04** with a hand-signed request.
- Sandbox card: `4811 1111 1111 1114` exp `01/26` CVV `123` OTP `112233`.
- For Viator-pathed bookings: `VIATOR_API_KEY` set OR `VIATOR_MOCK_BOOKING=true` (preferred for repeatable tests).

---

## Test cases

### TC-02-01 — Create local Midtrans booking idempotently

- **When** POST `/api/bookings/local` with `{ productCode, travelDate, paxMix, totalPrice, travelers, idempotencyKey: "uuid-1", source: "local" }`.
- **Then** `201` body includes `{ bookingRef, snapToken }`. Booking row persisted with `status: PENDING, idempotencyKey: "uuid-1"`. BookingTravelers persisted.
- **And when** the same body re-posted, `200` (not `201`) with the **same** `bookingRef` and `snapToken` (or refreshed token if stale). No duplicate Booking row.
- **Type**: Integration.

### TC-02-02 — Reject booking without auth

- POST `/api/bookings/local` no session → `401 { error: "Unauthorized" }`.

### TC-02-03 — Reject booking missing required fields

- Body without `productCode` → `400 { error: ... }`. Same for `travelDate`, `paxMix`, `totalPrice`.

### TC-02-04 — Webhook signature verification

- **Given** `Booking { bookingRef: "ORDER123", status: PENDING }`, `MIDTRANS_SERVER_KEY=key`.
- **When** POST `/api/payment/notification` with `signature_key = sha512("ORDER123" + "200" + "1000.00" + "key")` and matching body.
- **Then** `200 { message: "Acknowledged" }`. `Booking.status = CONFIRMED`. **And** post-payment side-effects ran (see TC-02-06).
- **And when** signature wrong → `403`, no DB mutation.
- **Type**: Integration.

### TC-02-05 — Webhook status mapping

For each `(transaction_status, fraud_status)` combination, after a valid webhook hit, `Booking.status` is the right enum value:

| transaction_status | fraud_status | Expected `BookingStatus` |
|---|---|---|
| `capture` | `accept` | `CONFIRMED` |
| `capture` | `challenge` | `PENDING` (with fraud flag in meta if recorded) |
| `settlement` | – | `CONFIRMED` |
| `pending` | – | `PAYMENT` |
| `cancel` | – | `CANCELLED` |
| `deny` | – | `CANCELLED` |
| `expire` | – | `CANCELLED` |
| `refund` / `partial_refund` | – | `CANCELLED` |

### TC-02-06 — Post-payment side-effects on `CONFIRMED`

After webhook flips a Booking to `CONFIRMED` for the first time:

1. `ticketToken` generated and persisted (`Booking.ticketToken` non-null).
2. If `Booking.source === "viator"` AND `viatorBookingRef` present: `viatorService.confirmBooking` called. Otherwise skipped (per the source-aware rule).
3. `lib/email.sendBookingConfirmation` sent **once**. Re-sending the same webhook is a no-op (`if (booking.voucherEmailed) return ack`).
4. Loyalty: `LoyaltyAccount.pointsBalance` increased by `floor(totalPrice * tierMultiplier / 1000)` (multiplier 1× / 1.5× / 2× for BRONZE/SILVER/GOLD). One `LoyaltyLedger { reason: "BOOKING", refId: bookingRef }`.
5. Referral conversion: if this is the user's **first** `CONFIRMED` booking AND a `Referral { inviteeUserId, status: "SIGNED_UP" }` exists, the row flips to `CONVERTED` and inviter gets +500 pts (`LoyaltyLedger { reason: "REFERRAL", refId: bookingRef }`).
6. `EmailDelivery` row created with `type: "BOOKING_CONFIRMATION"` (when sent through `sendTrackedEmail`).

### TC-02-07 — Webhook is idempotent

- Re-fire same webhook 3×. Booking status remains `CONFIRMED`, ticket token unchanged, exactly **one** confirmation email row in `EmailDelivery`, exactly **one** loyalty ledger entry per booking.

### TC-02-08 — Auto-cleanup of expired pendings

- **Given** `Booking { status: PENDING, snapToken: "...", createdAt: -25h }`.
- **When** GET `/api/bookings` as that user.
- **Then** the Booking has been **soft-deleted / cancelled** (whichever the route does today; see [app/api/bookings/route.ts](../../app/api/bookings/route.ts)). Confirm by direct Prisma read.

### TC-02-09 — Cron auto-complete-bookings flips past-travel-date confirmed bookings to `COMPLETED`

- **Given** `Booking { status: CONFIRMED, travelDate: -1d }`.
- **When** POST `/api/cron/auto-complete-bookings` with `Authorization: Bearer ${CRON_SECRET}`.
- **Then** `200 { message: "..." }`, Booking is now `COMPLETED`. Reject without bearer → `401`.

### TC-02-10 — Ticket page renders QR

- **Given** `Booking.ticketToken = "abcd"`.
- **When** GET `/ticket/abcd`.
- **Then** server-rendered page contains the QR (PNG via `qrcode`), product title, traveler names. Wrong token → `404`.

### TC-02-11 — Mock booking path (no Viator key)

- **Given** `VIATOR_MOCK_BOOKING=true` (or `VIATOR_API_KEY` empty).
- **When** booking goes through.
- **Then** Booking is created locally with `source: "local"`, `viatorBookingRef: null`. Webhook still flips status. No outbound Viator call (assert by mock spy or by absence of `[Viator]` log).

### TC-02-12 — Cleanup-booking-tokens cron

- **Given** confirmed booking older than retention window.
- **When** POST `/api/cron/cleanup-booking-tokens` with bearer.
- **Then** ticket token cleared (or whichever the current route does); confirm shape matches the existing route file.

---

## Manual QA checklist

- [ ] Browse to a tour, click "Book", complete checkout
- [ ] Snap modal opens, paste sandbox card, complete OTP
- [ ] Redirect lands on `/booking-success`
- [ ] Webhook flips `Booking.status` to `CONFIRMED` (check via Prisma Studio or `/profile`)
- [ ] Confirmation email arrives within 30 s
- [ ] Open ticket link from email → QR renders
- [ ] Re-fire the webhook (Midtrans dashboard "Re-send notification") → still 1 email, 1 ledger entry
- [ ] Cancel during Snap → Booking remains `PENDING` → cron cleanup cancels it after 24 h
- [ ] As user with `Referral SIGNED_UP`, complete first booking → inviter `LoyaltyAccount.pointsBalance += 500`, Referral `status=CONVERTED`
- [ ] Trigger `/api/cron/auto-complete-bookings` with bearer → past-date confirmed flips to `COMPLETED`

## Third-party / local response checklist

| Surface | Expect |
|---|---|
| `POST {snap}/transactions` | `{ token: "<snap-token>", redirect_url: "..." }` |
| Midtrans webhook body | `{ order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, payment_type, ... }` — see [lib/config/midtrans.ts](../../lib/config/midtrans.ts) |
| Viator confirmBooking | `200 { bookingRef, status }` (or 4xx → swallowed, log only) |
| `LoyaltyAccount` row | `{ userId, pointsBalance, tier, lifetimeSpend }` |
| `LoyaltyLedger` row | `{ delta, reason in ["BOOKING","REFERRAL","REDEEM","SIGNUP","ADJUST"], refId }` |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Webhook returns 200 but booking stuck `PENDING` | signature mismatch silently logged; check `console.error` line | recompute SHA512 with the exact string `order_id+status_code+gross_amount+SERVER_KEY` |
| Two confirmation emails | idempotency check missing or bypassed | re-add `if (booking.voucherEmailed) return ack` guard |
| Loyalty pts doubled | multi-fire webhook hitting `pointsBalance: { increment }` without idempotency | gate on `LoyaltyLedger.findUnique({ refId: bookingRef, reason: "BOOKING" })` first |
| Snap modal doesn't open | client-side missing `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, or Snap.js script not loaded | confirm `<Script src={MIDTRANS_SNAP_URL}>` in checkout layout |
| `viatorService.confirmBooking` 401 | bad `VIATOR_API_KEY` | rotate; confirm header is `exp-api-key` not `Authorization` |
| Webhook never arrives in dev | dev URL not reachable from Midtrans | use `ngrok` and set the public URL in Midtrans dashboard |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

`/api/payment/notification`, `/api/bookings/local`, `/ticket/[token]`, `/booking-success`, `/checkout`, `/payment/*` all present in build output.
