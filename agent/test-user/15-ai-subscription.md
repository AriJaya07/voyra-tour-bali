# 15 · AI Subscription + Credit System

> Updated: 2026-05-02

Manual QA checklist for the AI subscription + credit subsystem (Phases 1–6).

---

## Surface area

### Public
| Route | Status |
|---|---|
| `GET /api/ai/plans` | Public catalog (plans + packs) |
| `GET /api/ai/wallet` | Auth user's balance + plan + grants peek |
| `GET /api/ai/usage?range=` | Auth user's recent calls + ledger |
| `POST /api/ai/topup` | Snap token for one-time pack |
| `GET\|POST\|PATCH /api/ai/subscription` | View / start / change plan |
| `POST /api/ai/subscription/cancel` | Cancel at period end |
| `POST /api/ai/subscription/resume` | Undo cancel |
| `POST /api/ai/loyalty-redeem` | Loyalty pts → AI credits (Voyager+) |
| `GET\|POST\|DELETE /api/ai/family-seats` | Founder seat management |
| `POST /api/ai/family-seats/accept` | Invitee redeems token |

### AI endpoints (gated)
| Route | Cost | Gate |
|---|---|---|
| `POST /api/ai/chat` | 2 credits | Auth or guest IP quota (5/day) |
| `POST /api/ai/plan` | 8 credits (≤7d) / 12 (8–14d) | Explorer+ for plan, Voyager+ for >7d |
| `POST /api/ai/concierge` | 4 credits | Voyager+ |
| `POST /api/ai/cultural` | 2 credits | Explorer+ |
| `POST /api/ai/day-of-trip` | 0 credits if confirmed traveler in window, else 3 | Voyager+ when no booking |
| `POST /api/ai/voucher-read` | 5 credits | Voyager+ + `ENABLE_AI_VISION=true` |
| `POST /api/ai/itinerary/book` | 0 credits | Explorer+ |

### Admin
| Route | Notes |
|---|---|
| `GET /api/admin/ai/metrics` | Range-based aggregates |
| `GET /api/admin/ai/users` | Per-user breakdown |
| `POST /api/admin/ai/grant` | Manual credit grant (audit via refId) |
| `POST /api/admin/ai/refund` | Reverses AiPayment + reclaims unspent credits |
| `GET /api/admin/ai/abuse` | Hot IP + denial repeats |

### Cron (`Authorization: Bearer ${CRON_SECRET}`)
- `/api/cron/ai-subscription-renewals` — daily 18:00 UTC
- `/api/cron/ai-renewal-reminders` — daily 01:00 UTC
- `/api/cron/ai-grace-sweep` — hourly
- `/api/cron/ai-expire-credits` — daily 19:00 UTC
- `/api/cron/ai-usage-rollup` — daily 20:00 UTC

---

## Acceptance criteria

### Free tier
- [ ] First chat call of the UTC month grants 20 free credits via `ensureFreeMonthlyGrant`
- [ ] Same user calling chat twice within the month does **not** double-grant
- [ ] Free user calling `/api/ai/plan` → HTTP 402 `FEATURE_LOCKED`
- [ ] Guest 6th chat call within 24h → HTTP 402 `QUOTA` with `upgradeUrl=/register`

### Reservation lifecycle
- [ ] Successful chat → ledger row `reservationStatus=SETTLED`, balance decrement matches actual cost (≤ reserved)
- [ ] LLM call throws → `cancelReservation` flips ledger to `CANCELLED`, balance restored
- [ ] Streaming chat that disconnects mid-flight settles with `outChars`-derived cost

### Top-up
- [ ] `POST /api/ai/topup { pack: "STANDARD" }` returns Snap token
- [ ] Midtrans webhook with verified signature → `AiPayment.status=PAID`, grant created with 365-day TTL
- [ ] Re-fired webhook is idempotent (no double-grant) — checked via `paymentId === refId` collision

### Subscription
- [ ] `POST /api/ai/subscription { plan: "VOYAGER" }` → row `PENDING_PAYMENT`, Snap token returned
- [ ] On webhook PAID → status `ACTIVE`, period 30 days, 1,000 credit grant
- [ ] `PATCH /api/ai/subscription { plan: "FOUNDER" }` (upgrade) → prorated charge + immediate prorated credits
- [ ] `PATCH ... { plan: "EXPLORER" }` (downgrade) → 200 with `deferred=true` + `pendingPlanKey=EXPLORER`
- [ ] Renewal cron picks `currentPeriodEnd ≤ +24h` → emails Snap link → on payment, period extends + `pendingPlanKey` cleared
- [ ] Cancel → `cancelAtPeriodEnd=true, autoRenew=false`. Renewal cron skips. At period end, status → `EXPIRED`.

### Premium features
- [ ] Concierge persists `__MEMO__:` markers into `AiChatMemory.notes` (max 12)
- [ ] Concierge memory survives session reload (turn count increments)
- [ ] `/api/ai/cultural` returns `events[]` from `BaliEvent` window when relevant
- [ ] Confirmed traveler in `[today−1, today+14d]` → day-of-trip free; charges 0 credits
- [ ] Voucher reader with `ENABLE_AI_VISION=false` → 503 `FEATURE_DISABLED`
- [ ] Voucher reader returns `extracted` JSON; with `addToTrips=true` writes `ImportedTrip`
- [ ] Itinerary bundle with valid Voyager item → returns 5%-discount table + writes `ImportedTrip` (idempotent by `userId+externalRef`)

### Family seats (Founder)
- [ ] Invite existing Voyra user → seat auto-accepts; member's `canUseFeature("concierge")` returns true
- [ ] Invite non-user email → seat created with `inviteToken`, email sent with `?accept-seat=` link
- [ ] Invitee opens `/profile/ai?accept-seat=<token>` → seat accepted, query stripped from URL
- [ ] Invitee with mismatched email → 403 on accept
- [ ] Owner cannot exceed `AI_PLANS.FOUNDER.features.familySeats` (3 default)
- [ ] Revoke → seat-holder loses inherited features at next `canUseFeature` call

### Loyalty redemption
- [ ] Voyager+ user with 2,000 pts → `POST /api/ai/loyalty-redeem { points: 2000 }` → 100 credits granted, 90-day TTL
- [ ] LoyaltyAccount.pointsBalance decreases by 2,000
- [ ] Free / Explorer user → 402 `FEATURE_LOCKED`
- [ ] Non-multiple of 1,000 → 400

### Admin tools
- [ ] `GET /api/admin/ai/metrics?range=30d` returns endpoint+status breakdowns + top spenders
- [ ] `POST /api/admin/ai/grant` writes a `BACKFILL`/`ADJUST` grant + ledger row
- [ ] `POST /api/admin/ai/refund` flips `AiPayment.status=REFUNDED` + reclaims unspent credits + ledger `REFUND` row
- [ ] `GET /api/admin/ai/abuse` lists top guest IPs and DENIED_QUOTA repeats

### Crons
- [ ] Renewal cron — `failedRenewals` increments on Snap fail; status → `GRACE`
- [ ] Grace sweep — `GRACE > 72h` → `EXPIRED`, downgrade email sent
- [ ] Expire credits — past-`expiresAt` grants get `expiredAt` set + negative ledger row + wallet decrement; T-7 / T-1 emails fire once per user per run
- [ ] Usage rollup — yesterday's raw rows aggregated into `_rollup_<endpoint>` rows; raw rows past 90d purged

### Kill switch
- [ ] `AI_CREDIT_GUARD=off` → `reserveCredits` returns ok with `MAX_SAFE_INTEGER` balance; no DB writes
- [ ] `ensureFreeMonthlyGrant` is also short-circuited

---

## Manual smoke (5 minutes)

```bash
# 1. Wallet for known user
curl -s -b "$COOKIE" http://localhost:3000/api/ai/wallet | jq .

# 2. Public catalog
curl -s http://localhost:3000/api/ai/plans | jq '.plans | length'

# 3. Guest chat × 6 (expect 402 on the 6th)
for i in 1 2 3 4 5 6; do
  curl -s -X POST http://localhost:3000/api/ai/chat \
    -H 'Content-Type: application/json' \
    -d '{"userMessage":"hi"}' | head -c 60
  echo
done

# 4. Admin metrics (replace COOKIE with admin session)
curl -s -b "$ADMIN_COOKIE" 'http://localhost:3000/api/admin/ai/metrics?range=30d' | jq '.usageByEndpoint'

# 5. Cron — local invocation
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/ai-expire-credits | jq .
```

---

## Files of interest
- Schema: `prisma/schema.prisma` — `AiSubscription`, `AiCreditWallet`, `AiCreditGrant`, `AiCreditLedger`, `AiUsage`, `AiPayment`, `AiChatMemory`, `AiFamilySeat`
- Service core: `lib/services/aiCreditService.ts`, `lib/services/aiPaymentService.ts`, `lib/services/aiGuestQuota.ts`
- Config: `lib/config/aiCosts.ts`, `lib/config/aiPlans.ts`
- Routes: `app/api/ai/*`, `app/api/admin/ai/*`, `app/api/cron/ai-*`
- UI: `components/ai/*`, `app/plans/page.tsx`, `app/profile/ai/page.tsx`
- Browser layer: `utils/service/ai.service.ts`, `utils/hooks/useAiWallet.ts`
