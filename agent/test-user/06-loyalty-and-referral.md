---
title: 06 · Loyalty & Referral
updatedAt: 2026-05-01
---

# 06 · Loyalty & Referral

## Goal

Users earn points on confirmed bookings (with tier multipliers), can redeem them for IDR discount codes, and get bonus points for inviting friends who book.

## Surface area

| Concern | File |
|---|---|
| Loyalty read | [app/api/loyalty/route.ts](../../app/api/loyalty/route.ts) |
| Redeem | [app/api/loyalty/redeem/route.ts](../../app/api/loyalty/redeem/route.ts) |
| Rewards UI | [app/profile/rewards/page.tsx](../../app/profile/rewards/page.tsx) |
| Earn (post-payment) | [lib/services/postPaymentService.ts](../../lib/services/postPaymentService.ts) |
| Referral API | [app/api/referrals/route.ts](../../app/api/referrals/route.ts) |
| Register hook | [app/api/auth/register/route.ts](../../app/api/auth/register/route.ts) |
| Models | `LoyaltyAccount`, `LoyaltyLedger`, `Referral`, `User.loyaltyTier` (if surfaced) |

## Constants (from `app/api/loyalty/redeem/route.ts`)

- `RATE_PER_1000PTS_IDR = 50_000`
- `MIN_REDEEM = 1000`
- `MAX_REDEEM = 50_000`
- Increments: 1000

Tier multipliers (per [postPaymentService.ts](../../lib/services/postPaymentService.ts)):

| Tier | Multiplier |
|---|---|
| BRONZE | 1× |
| SILVER | 1.5× |
| GOLD | 2× |

Signup bonus: 200 pts. Referral conversion bonus: 500 pts (to inviter), credited only on **first** confirmed booking by the invitee.

---

## Test cases

### TC-06-01 — Read loyalty

- **When** GET `/api/loyalty` as user A.
- **Then** `200 { pointsBalance, tier, lifetimeSpend, recentLedger: [...] }`. Reading creates the account on first call (upsert) if missing.

### TC-06-02 — Earn on first CONFIRMED booking

- **Given** user A is BRONZE, lifetime 0.
- **When** webhook flips Booking to `CONFIRMED` with `totalPrice = 1_500_000` IDR.
- **Then** `pointsBalance += 1500` (1500000 / 1000 × 1.0). One ledger row `{ delta: 1500, reason: "BOOKING", refId: bookingRef }`. `lifetimeSpend = 1_500_000`.

### TC-06-03 — Earn idempotency

- Re-fire the same webhook. Pts unchanged. Ledger still has exactly one row for that `refId`. (Implementation gate: `findUnique({ refId, reason: "BOOKING" })` before increment.)

### TC-06-04 — Tier promotion

- Cumulative lifetimeSpend ≥ thresholds promotes tier (verify the threshold table in [postPaymentService.ts](../../lib/services/postPaymentService.ts)). Subsequent bookings use the **new** multiplier.

### TC-06-05 — Redeem 1000 pts

- **Given** user has ≥ 1000 pts.
- **When** POST `/api/loyalty/redeem` `{ points: 1000 }`.
- **Then** `200 { ok: true, code: "VOYRA-<id>-<base36>", points: 1000, idrValue: 50000, note: "..." }`. `pointsBalance -= 1000`. Ledger row `{ delta: -1000, reason: "REDEEM", refId: code }`.

### TC-06-06 — Redeem boundary errors

- `points = 0` → 400 "Redeem 1000-50000".
- `points = 999` → 400.
- `points = 50001` → 400.
- `points = 1500` → 400 "Redeem in 1000-point increments".
- `points > pointsBalance` → 400 "Not enough points".

### TC-06-07 — Redeem unauthorised

- Unsigned-in POST → `401`.

### TC-06-08 — Referral signup credit

- **Given** inviter has Referral row `{ code: "ABC", status: "PENDING", inviterUserId }`.
- **When** new user signs up with `referralCode: "ABC"`.
- **Then** Referral row `status: SIGNED_UP`, `inviteeUserId` set. Invitee gets `LoyaltyLedger { reason: "SIGNUP", delta: 200 }`. Inviter gets **no** points yet.

### TC-06-09 — Referral conversion credit on first booking

- **Given** invitee with `Referral { status: SIGNED_UP }` and **zero** prior CONFIRMED bookings.
- **When** invitee's first booking flips to CONFIRMED via webhook.
- **Then** Referral `status: CONVERTED`, inviter `LoyaltyLedger { reason: "REFERRAL", delta: 500, refId: bookingRef }`. Inviter `pointsBalance += 500`.

### TC-06-10 — Second booking does not double-credit referral

- Invitee's second confirmed booking does not create another REFERRAL ledger row. Guard: `Referral.status === "CONVERTED"` blocks re-entry.

### TC-06-11 — Generate referral code

- **When** GET `/api/referrals` as user A.
- **Then** `200 { code, signups, conversions }`. If no Referral row, one is created with a random code on the fly.

### TC-06-12 — Self-referral prevented

- New user signs up with their own (yet-to-exist) code → safe no-op or 400. Inviter cannot be the invitee.

### TC-06-13 — Rewards page UI

- GET `/profile/rewards`. Shows balance, tier badge, recent ledger, redeem input + button + result block. After redemption, the `code` is displayed and copyable.

---

## Manual QA checklist

- [ ] Sign up with `?ref=<existing code>` → `/profile/rewards` shows 200 SIGNUP pts
- [ ] Complete first booking → inviter has +500 REFERRAL pts and Referral CONVERTED
- [ ] As BRONZE user, complete a Rp 1M booking → +1000 pts
- [ ] Try to redeem 999 → 400 message
- [ ] Try to redeem 1500 → 400 increment message
- [ ] Try to redeem more than balance → 400 "Not enough"
- [ ] Successfully redeem 1000 → result block shows `VOYRA-...` code; balance drops; ledger updated
- [ ] Re-fire same Midtrans webhook → no double credit
- [ ] Promote to SILVER (manual SQL or after threshold spend) → next booking earns 1.5×

## Third-party / local response checklist

| Surface | Shape |
|---|---|
| GET `/api/loyalty` | `{ pointsBalance: number, tier: "BRONZE"|"SILVER"|"GOLD", lifetimeSpend: number, ledger: LedgerRow[] }` |
| POST `/api/loyalty/redeem` | success: `{ ok: true, code, points, idrValue, note }`; error: `{ error: string }` |
| GET `/api/referrals` | `{ code, signups, conversions }` |
| `LoyaltyLedger.reason` enum | `BOOKING | REFERRAL | REDEEM | SIGNUP | ADJUST` |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Pts doubled after webhook retry | missing idempotency guard | gate on `LoyaltyLedger.findFirst({ refId, reason })` before increment |
| Referral never converts | `Booking.status` was already CONFIRMED before the conversion check ran | run the conversion check **inside** `handlePaymentSuccess` after status flip, not before |
| Redeem code reused | `code` column not unique | add `@unique` if surfaced as a redeemable record (current impl: code is one-shot return value, not stored) |
| Tier never promotes | thresholds compared against `pointsBalance` instead of `lifetimeSpend` | use `lifetimeSpend` |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

`/api/loyalty`, `/api/loyalty/redeem`, `/api/referrals`, `/profile/rewards` all in output.
