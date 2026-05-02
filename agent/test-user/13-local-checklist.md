---
title: 13 · Local Response Checklist
updatedAt: 2026-05-01
---

# 13 · Local (Prisma + Route) Response Checklist

> Source-of-truth shapes for every Prisma model and the response that each `/api/**/route.ts` endpoint returns. Use as a regression guard when refactoring.

When adding a model or endpoint, append a row here.

---

## Models — at a glance

| Model | Key fields | Cascades / FKs | Notes |
|---|---|---|---|
| `User` | id, email@unique, password?, name, image, role, currency, emailVerified, loginAttempts, loginLockedUntil, createdAt | `Booking → User CASCADE` (anonymise instead of delete on user-initiated delete; see [01](./01-auth-and-account.md) TC-01-14) | role: USER \| EDITOR \| ADMIN |
| `Account` | provider, providerAccountId, userId | `Account → User CASCADE` | NextAuth Google rows |
| `Category` | id, name, slug@unique | `Destination → Category SET NULL` | |
| `Destination` | id, slug@unique, title, description, price, categoryId? | `Content/Location/Image → Destination CASCADE` | |
| `Package` | id, slug@unique, categoryId? | `→ Category SET NULL`, `→ Destination` | |
| `Content` | id, destinationId, dateAvailable, isAvailable | CASCADE on parent | |
| `Location` | id, destinationId | CASCADE | |
| `Image` | id, key, url, isMain, order | CASCADE on parent | |
| `Booking` | id, bookingRef@unique, userId, idempotencyKey?@unique, productCode, productTitle, totalPrice, travelDate, pax, status, source, viatorBookingRef?, snapToken?, ticketToken?, voucherEmailed | `→ User CASCADE` | source: `local | viator | imported` |
| `BookingTraveler` | id, bookingId, name, dateOfBirth?, passportNo? | `→ Booking CASCADE` | |
| `MockBooking` | id, productCode, … | local | feeds `VIATOR_MOCK_BOOKING` |
| `Subscription` | id, email@unique | local | newsletter |
| `Review` | id, productCode, rating, body, userId, status | `→ User CASCADE` | status: PENDING \| APPROVED \| REJECTED |
| `WishlistItem` | id, userId, productCode, source, savedAt, priceAtSave? | `→ User CASCADE` | DB-only persistence (no localStorage) |
| `RecentlyViewedItem` | id, userId, productCode, viewedAt | `→ User CASCADE` | TTL 24 h |
| `UserPreferences` | userId@id | `→ User CASCADE` | freeform JSON for travel profile |
| `BaliNote` | id, userId, targetType, targetKey, body, rating?, visibility, status | `→ User CASCADE` | |
| `SavedItinerary` | id, userId, slug?, title, days(JSON), isPublic | `→ User CASCADE` | |
| `BaliEvent` | id, slug@unique, name, date, type, region?, description, link? | local | |
| `TourGuide` | id, slug@unique, name, photo?, bio?, languages[], yearsActive, rating, reviewCount, operatorId? | local | |
| `PushSubscription` | id, userId, endpoint@unique, p256dh, auth, userAgent? | `→ User CASCADE` | |
| `Operator` | id, slug@unique, name, status, licenseNo, insurance, rejectReason?, ownerUserId | `→ User` | status: PENDING \| APPROVED \| SUSPENDED \| REJECTED |
| `Guide` | id, slug@unique, title, body, region?, tags[], status, publishedAt?, views, coverImage? | local | CMS articles, distinct from `TourGuide` |
| `EmailCampaign` | id, type, subject, body, scheduledAt?, status | local | |
| `EmailDelivery` | id, campaignId?, userId, type, sentAt?, openedAt?, clickedAt?, unsubscribed, meta | local | tracking ledger |
| `LoyaltyAccount` | userId@id, pointsBalance, tier, lifetimeSpend | `→ User CASCADE` | |
| `LoyaltyLedger` | id, userId, delta, reason, refId?, createdAt | `→ User CASCADE` | reasons: BOOKING \| REFERRAL \| REDEEM \| SIGNUP \| ADJUST |
| `Referral` | id, code@unique, inviterUserId, inviteeUserId?, status | `→ User` | status: PENDING \| SIGNED_UP \| CONVERTED |
| `NotificationPref` | userId@id, weatherAlerts, volcanoAlerts, nyepiAlert, tripReminders, marketingEmails | `→ User CASCADE` | |
| `SavedTraveler` | id, userId, name, dateOfBirth?, passportNo? | `→ User CASCADE` | |
| `ImportedTrip` | id, userId, viatorBookingRef@unique-per-user, productCode, travelDate, totalPrice, currency, status | `→ User` | manual paste flow |
| `AiSubscription` | userId@unique, plan, status, currentPeriodEnd, cancelAtPeriodEnd, autoRenew, pendingPlanKey?, priceIdr, monthlyCredits, carryoverDays, carryoverCap | `→ User CASCADE` | status: PENDING_PAYMENT \| ACTIVE \| GRACE \| CANCELLED \| EXPIRED |
| `AiCreditWallet` | userId@id, balance, lifetimeEarned, lifetimeSpent | `→ User CASCADE` | denormalised totals; verify via ledger sum |
| `AiCreditGrant` | id, userId, source, amount, remaining, refId?, expiresAt, expiredAt? | `→ User CASCADE` | source: SUBSCRIPTION \| TOPUP \| PROMO \| REFERRAL \| LOYALTY_REDEEM \| REFUND \| ADJUST \| BACKFILL |
| `AiCreditLedger` | id, userId, delta, reason, refId?, reservationStatus?, settledAt?, meta? | `→ User CASCADE` | reservationStatus: RESERVED \| SETTLED \| CANCELLED |
| `AiUsage` | id, userId?, ipHash?, endpoint, creditsCost, tokensIn?, tokensOut?, durationMs?, status, meta? | `→ User SET NULL` | status: OK \| DENIED_QUOTA \| DENIED_AUTH \| ERROR; rolled up daily into `_rollup_*` rows; raw rows purged at 90d |
| `AiPayment` | id, userId, kind, plan?, pack?, paymentId@unique, idempotencyKey@unique, status, paidAt? | `→ User CASCADE` | kind: SUBSCRIPTION_NEW \| SUBSCRIPTION_RENEWAL \| TOPUP; paymentId prefix `AISUB-` / `AITOP-` routes shared webhook |
| `AiChatMemory` | userId@id, messages(JSON, ≤20 turns), notes(JSON, ≤12), turnCount | `→ User CASCADE` | concierge per-user memory |
| `AiFamilySeat` | id, ownerUserId, memberUserId?@unique, inviteEmail?, inviteToken?@unique, acceptedAt?, revokedAt? | `→ User CASCADE` (owner), `→ User SET NULL` (member) | Founder: max 3 active seats |

---

## Routes — response shape

> Compact reference. Detailed test cases live in the `0X-…` specs.

### Auth ([01](./01-auth-and-account.md))

| Verb + path | Body / Query | Success | Notes |
|---|---|---|---|
| POST `/api/auth/register` | `{ email, password, name, turnstileToken, referralCode? }` | `200 { message }` (legacy) | hooks loyalty signup +200 if referral |
| GET `/api/auth/verify?token=` | – | redirect | flips `emailVerified=true` |
| POST `/api/auth/forgot-password` | `{ email }` | `200 { message }` | no enumeration |
| POST `/api/auth/reset-password` | `{ token, password }` | `200 { message }` | rotates hash |
| POST `/api/auth/resend-verification` | `{ email }` | `200 { message }` | rate-limit recommended |
| POST `/api/auth/[...nextauth]` | NextAuth | varies | |

### Booking ([02](./02-booking-and-payment.md))

| Verb + path | Body / Query | Success | Notes |
|---|---|---|---|
| POST `/api/bookings/local` | `{ productCode, travelDate, paxMix, totalPrice, travelers, idempotencyKey, source }` | `201 { booking, snapToken }` | idempotent on key |
| GET `/api/bookings` | – | `200 Booking[]` | side-effect: cleanup expired pendings + Viator status sync |
| PATCH `/api/bookings` | `{ bookingRef, status }` | `200 { message, booking }` | only own bookings |
| POST `/api/payment/notification` | Midtrans webhook | `200 { message: "Acknowledged" }` | always 200 |
| GET `/ticket/[token]` | – | HTML | 404 on bad token |
| POST `/api/resend-ticket` | `{ bookingRef }` | `200 { message }` | owner only |

### Viator ([03](./03-viator-integrations.md))

| Verb + path | Query / Body | Success | Notes |
|---|---|---|---|
| GET `/api/viator?action=products` | `page, count, currency, tagIds, priorityIndex, allCategoryTagIds` | `200 { products, totalCount, page, count, hasMore }` | 5-min cache |
| GET `/api/viator?action=product_detail` | `productCode, currency` | `200 ProductDetail` | merges `pricing/flags/duration` from search |
| GET `/api/viator?action=search` | `query, page, count, currency` | `200 { products, totalCount, page, count, hasMore }` | empty `query` → empty |
| POST `/api/viator?action=availability` | `{ productCode, travelDate, paxMix }` | `200 { available, bookableItems[] }` | mock or live |
| POST `/api/viator?action=book` | `{ productCode, travelDate, pax, totalPrice, productTitle }` | `200 { orderId, bookingRef, status: "SUCCESS" }` | local DB row created |
| (sub-routes under `/api/viator/*`) | various | per file | each enforces 120 s timeout |

### Discovery ([04](./04-discovery-pages.md))

| Verb + path | Success | Notes |
|---|---|---|
| GET `/api/destinations` | `200 Destination[]` with nested | |
| GET `/api/categories` | `200 Category[]` with `_count` | |
| GET `/api/contents` | `200 Content[]` filtered by available | |
| GET `/api/locations` | `200 Location[]` | |
| GET `/api/packages` | `200 Package[]` | |
| GET `/api/bali-events` | `200 BaliEvent[]` | filtered/upcoming |
| GET `/api/tour-guides` | `200 TourGuide[]` | |
| GET `/api/notes/feed?limit=&offset=&targetType=` | `200 { items, total, hasMore }` | public + approved only |
| GET `/api/notes/public?targetType=&targetKey=` | `200 { items, total, ratingAvg, ratingCount }` | per-target |
| POST `/api/notes` | `{ targetType, targetKey, body, rating?, photos? }` | `201 BaliNote` | gated by auth + content rules |

### Personalization ([05](./05-personalization.md))

| Verb + path | Body / Query | Success |
|---|---|---|
| GET `/api/wishlist` | – | `200 WishlistItem[]` |
| POST `/api/wishlist` | `{ productCode, source, title, ... }` | `201` (or `200` toggle off) |
| DELETE `/api/wishlist?productCode=&source=` | – | `200` |
| GET `/api/recently-viewed` | – | `200 RecentlyViewedItem[]` (filtered ≤ 24 h) |
| POST `/api/recently-viewed` | upsert payload | `200` |

### Loyalty / Referral ([06](./06-loyalty-and-referral.md))

| Verb + path | Body | Success |
|---|---|---|
| GET `/api/loyalty` | – | `200 { pointsBalance, tier, lifetimeSpend, ledger }` |
| POST `/api/loyalty/redeem` | `{ points: 1000..50000 step 1000 }` | `200 { ok, code, points, idrValue, note }` |
| GET `/api/referrals` | – | `200 { code, signups, conversions }` |

### Itineraries / Trips ([07](./07-itineraries-and-trips.md))

| Verb + path | Body | Success |
|---|---|---|
| POST `/api/itineraries` | `{ title, days, slug?, isPublic }` | `201 SavedItinerary` |
| GET `/api/itineraries` | – | `200 SavedItinerary[]` (own) |
| POST `/api/imported-trips` | `{ viatorBookingRef, productCode, travelDate, totalPrice, currency }` | `201 ImportedTrip` |

### Admin ([08](./08-admin-cms.md))

| Verb + path | Body | Success |
|---|---|---|
| GET `/api/admin/operators` | – | `200 Operator[]` |
| PATCH `/api/admin/operators/[id]` | `{ status, rejectReason? }` | `200 Operator` |
| GET/POST `/api/admin/guides` | CMS body | `200 / 201 Guide` |
| PATCH/DELETE `/api/admin/guides/[id]` | `{ status }` / – | `200` |
| GET `/api/admin/bookings` | – | `200 Booking[]` |
| GET/POST `/api/admin/mock-bookings` | – / payload | `200 / 201 MockBooking` |
| GET/PATCH `/api/admin/reviews` (and `[id]`) | `{ status }` | `200 Review` |
| GET `/api/admin/subscribers` | – | `200 Subscription[]` |

### Cron ([09](./09-cron-and-jobs.md))

All POST. Every cron requires `Authorization: Bearer ${CRON_SECRET}`. Returns `200 { message, ...counts }` on success, `401` without bearer, `500` on unexpected.

### Comms ([10](./10-comms-and-notifications.md))

| Verb + path | Body | Success |
|---|---|---|
| GET `/api/email/open?d=` | – | `200 image/gif` |
| GET `/api/email/click?d=&u=` | – | `302` |
| POST `/api/subscribe` | `{ email }` | `200 { message }` |
| GET/POST `/api/unsubscribe` | `{ token, type? }` | `200` |
| GET `/api/push/vapid` | – | `200 { publicKey }` |
| POST `/api/push/subscribe` | `{ endpoint, keys: { p256dh, auth } }` | `200 { ok, id }` |
| DELETE `/api/push/subscribe` | `{ endpoint }` | `200 { ok }` |

### Misc

| Verb + path | Success |
|---|---|
| GET `/api/profile` | `200 { user, loyalty, notificationPref, preferences }` |
| PATCH `/api/profile` | `200 { user }` |
| DELETE `/api/account` | `200 { message }` (anonymises) |
| POST `/api/contact` | `200 { message }` (sends mail to support) |
| GET `/api/stats` | `200 { destinations, bookings, ... }` |
| GET `/api/proxy-download` | `200 binary` (signed S3 download) |

### AI Subsystem

| Verb + path | Body / Query | Success |
|---|---|---|
| GET `/api/ai/wallet` | – | `200 { balance, plan, planFeatures, subscription, grants }` |
| GET `/api/ai/plans` | – | `200 { plans, packs }` (public) |
| GET `/api/ai/usage?range=` | – | `200 { usage, ledger, totals }` |
| POST `/api/ai/topup` | `{ pack }` | `200 { paymentId, snapToken, amountIdr, pack }` |
| GET/POST `/api/ai/subscription` | – / `{ plan }` | `200 { subscription }` / `200 { paymentId, snapToken, plan }` |
| PATCH `/api/ai/subscription` | `{ plan }` | `200 { ... }` upgrade Snap or `{ deferred, pendingPlanKey }` |
| POST `/api/ai/subscription/cancel`/`/resume` | – | `200 { message, subscription }` |
| POST `/api/ai/chat` | `{ userMessage }` | `text/plain` stream; 2 credits |
| POST `/api/ai/plan` | `{ days, interests, region, fromDate, toDate }` | `200 { items }`; 8/12 credits |
| POST `/api/ai/plan-refine` | `{ itineraryId, day, instruction }` | `200 { refinedDay, items }`; 6 credits Voyager+ |
| POST/GET/DELETE `/api/ai/concierge` | `{ userMessage }` / – | `200 { reply, remembered }`; 4 credits Voyager+ |
| POST `/api/ai/cultural` | `{ userMessage, date? }` | `200 { reply, events }`; 2 credits Explorer+ |
| POST `/api/ai/day-of-trip` | `{ userMessage, region?, weather? }` | `200 { reply, free, booking }`; 0 credits if traveler-in-window |
| POST `/api/ai/voucher-read` | multipart `file` | `200 { extracted, ... }`; 5 credits Voyager+; `503` when vision unset |
| POST `/api/ai/loyalty-redeem` | `{ points }` | `200 { creditsGranted, newPointsBalance }`; Voyager+ |
| POST `/api/ai/itinerary/book` | `{ itineraryId, dayFilter? }` | `200 { bundle, totals, promoCode }`; 0 credits Explorer+ |
| GET/POST/DELETE `/api/ai/family-seats` | – / `{ email }` / `?id=` | `200 { maxSeats, used, seats }` etc. Founder only |
| POST `/api/ai/family-seats/accept` | `{ token }` | `200 { message, seatId }` |
| GET `/api/admin/ai/{metrics,users,abuse}` | `?range=` | ADMIN-only aggregates |
| POST `/api/admin/ai/grant` | `{ userId, amount, expiresInDays?, reason? }` | `200 { message, refId }` |
| POST `/api/admin/ai/refund` | `{ paymentId, reason? }` | `200 { reclaimed, totalGranted, note }` |
| GET `/api/cron/ai-{subscription-renewals,renewal-reminders,grace-sweep,expire-credits,usage-rollup}` | Bearer `${CRON_SECRET}` | various rollup counts |

All metered endpoints return **HTTP 402** with `{ error, reason, balance, upgradeUrl }` on quota miss or feature lock.

---

## Build verification

```bash
npx tsc --noEmit
npx next build
```

Failures here usually mean a route's exported function signature drifted from Next 16's expectations (e.g. forgot to await `params: Promise<{ slug: string }>`).
