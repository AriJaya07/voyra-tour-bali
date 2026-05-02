# Domain Model — Voyra Tour Bali

> Glossary, entity relationships, and business-logic invariants. Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).

---

## 1. Glossary

| Term | Meaning |
|---|---|
| **Category** | Top-level grouping of destinations and packages (e.g. "Beach", "Cultural"). |
| **Destination** | A bookable place / experience curated by Voyra. May contain sub-locations, content articles, packages, and images. |
| **Package** | A bundled tour offering attached to a destination (and optionally a category). |
| **Content** | A timed article / event tied to a destination (e.g. "Galungan Festival 2026"). |
| **Location** | Sub-location inside a destination (e.g. specific waterfall within a regency). |
| **Image** | A single S3-hosted asset, polymorphically attached to *one of* destination / package / content / location. |
| **User** | Customer or admin. Role drives access. |
| **Booking** | A user's purchase of a tour. Either a Voyra-managed booking (Midtrans-paid) or a Viator passthrough. |
| **BookingTraveler** | Per-traveller row attached to a booking (lead + companions). |
| **Subscription** | Newsletter email subscription. |
| **MockBooking** | Pre-seeded booking record used for QA and demos when Viator API key is absent or `VIATOR_MOCK_BOOKING=true`. |
| **Idempotency Key** | Per-booking unique key used to prevent duplicate creation on client retries. |
| **Snap Token** | Midtrans-issued token used by `window.snap.pay()` on the client. |
| **Ticket Token** | Voyra-generated unique token surfaced as `/ticket/[token]` for the customer voucher. |
| **BaliNote** | User-authored note attached to a `targetType/targetKey` pair (tour/destination/place). Optional `date` field surfaces it on the Trip Calendar. |
| **SavedItinerary** | AI-generated trip plan saved by a user. `visibility=PUBLIC` mints `shareSlug` for `/share/itinerary/[slug]`. |
| **CalendarEvent** | User-created event on the Trip Calendar. Supports recurrence (RFC5545 RRULE subset stored in `recurrence` + `recurrenceUntil`). Optional `noteId` link. `reminderSent` gates T-1 push. |
| **AppNotification** | Per-user inbox row. Either spawned by a `NotificationBroadcast` fan-out (idempotent via `@@unique([broadcastId,userId])`) or written ad-hoc via `notifyUser()`. |
| **NotificationTemplate** | Admin-managed reusable announcement. Used as starting point for broadcasts; broadcasts snapshot the content so template edits don't drift sent records. |
| **NotificationBroadcast** | One fan-out job: title/body snapshot + audience (`ALL`/`ROLE_USER`/`ROLE_ADMIN`/`USER_LIST`) + channels (`inApp` always, `push`, `email`) + scheduling. State machine: `DRAFT → SCHEDULED → SENDING → SENT \| FAILED \| CANCELLED`. |
| **PushSubscription** | Web-push subscription per user/device. Stale entries (HTTP 404/410 from push service) are auto-pruned on send. |
| **Calendar Share Slug** | `User.calendarShareSlug` — opaque token granting public read-only access to a user's `visibility=PUBLIC` calendar events at `/share/calendar/[slug]`. Rotatable via `DELETE /api/profile/calendar-share`. |

---

## 2. Entity Relationship Diagram

```
                          ┌────────────┐
                          │  Category  │
                          └──────┬─────┘
                                 │ 1:N (SetNull)
                ┌────────────────┼────────────────┐
                ▼                                 ▼
        ┌─────────────┐                    ┌──────────┐
        │ Destination │                    │  Package │
        └──┬───┬───┬──┘                    └────┬─────┘
           │   │   │ 1:N (Cascade)              │ 1:N (Cascade)
   ┌───────┘   │   └─────────────┐              │
   ▼           ▼                 ▼              ▼
┌────────┐ ┌─────────┐    ┌──────────┐     ┌─────────┐
│Content │ │Location │    │  Image   │◄────┤  Image  │
└────┬───┘ └────┬────┘    └──────────┘     └─────────┘
     │ 1:N      │ 1:N
     ▼          ▼
  ┌─────┐    ┌─────┐
  │Image│    │Image│       (Image is polymorphic — see §3.5)
  └─────┘    └─────┘

         ┌──────┐                ┌─────────┐
         │ User │ 1:N ─────────► │ Booking │ 1:N ──► BookingTraveler
         └──────┘                └────┬────┘
                                      │
                                      │ references productCode
                                      ▼
                                (Viator product, not in DB)
```

---

## 3. Models

### 3.1 `Category`
| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | autoincrement |
| `name` | String | display label |
| `slug` | String **unique** | URL segment |
| `description` | String? | optional copy |
| `image` | String? | S3 URL |
| `destinations` | Destination[] | `onDelete: SetNull` from child side |
| `packages` | Package[] | `onDelete: SetNull` from child side |
| `createdAt`/`updatedAt` | DateTime | |

**Invariants**
- Deleting a category does **not** cascade to destinations/packages — they survive with `categoryId = null`.

### 3.2 `Destination`
| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `title` | String | |
| `slug` | String? **unique** | optional but unique when present |
| `description` | String | rich text / markdown |
| `price` | Float? | indicative starting price IDR |
| `categoryId` | Int? | FK SetNull |
| `images` | Image[] | polymorphic |
| `packages` | Package[] | |
| `contents` | Content[] | cascade delete |
| `locations` | Location[] | cascade delete |

**Invariants**
- Slug must be URL-safe and unique across all destinations.
- Deleting a destination **cascades** to `Content`, `Location`, and any `Image` attached via `destinationId`.
- Packages and Categories are **detached** (`SetNull`) — they survive.

### 3.3 `Package`
| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `title` / `slug` (unique) / `description` | | |
| `price` | Float | required (vs Destination, optional) |
| `categoryId` / `destinationId` | Int? | both FK `SetNull` |
| `images` | Image[] | |

### 3.4 `Content`
A timed editorial entry tied to a destination.
- `dateAvailable: DateTime` (when the event/feature occurs).
- `isAvailable: Boolean` (manual hide/show).
- `destinationId` required, `onDelete: Cascade`.

### 3.5 `Location`
Sub-locations within a destination.
- `hrefLink: String?` for external map links.
- `destinationId` required, `onDelete: Cascade`.

### 3.6 `Image` (polymorphic)
| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `url` | String | S3 URL |
| `key` | String | S3 object key (used for delete) |
| `altText` | String? | |
| `isMain` | Boolean | designate hero |
| `order` | Int? | sort within owner |
| `destinationId` / `packageId` / `contentId` / `locationId` | Int? | exactly one should be set |
| `createdAt` | DateTime | no `updatedAt` |

**Invariants**
- An image *should* be attached to exactly one parent. The schema does not enforce this — application logic must.
- Deleting any parent cascades to its images.
- Deleting an image (S3 row) does **not** delete the S3 object — call `deleteImageFromS3(key)` explicitly.

### 3.7 `User`
| Field | Type | Notes |
|---|---|---|
| `id` | Int (PK) | |
| `email` | String **unique** | |
| `password` | String? | bcrypt hash; null for Google-only users |
| `name` | String? | |
| `role` | `UserRole` | `ADMIN \| EDITOR \| USER` (default `USER`) |
| `image` | String? | profile picture |
| `phone` | String? | |
| `provider` | String | `"credentials"` (default) or `"google"` |
| `emailVerified` | Boolean | gate for `USER` login |
| `verificationToken` / `tokenExpiry` | | for email verification |
| `resetToken` / `resetTokenExpiry` | | for password reset |
| `loginAttempts` | Int | reset on success |
| `loginLockedUntil` | DateTime? | populated on 3rd failure |
| `bookings` | Booking[] | cascade on user delete |

**Invariants**
- After 3 failed credential logins: `loginLockedUntil = now + 60s`. Within the window, login returns "Account locked".
- `USER` role cannot log in unless `emailVerified=true`. `ADMIN`/`EDITOR` are exempt.

### 3.8 `Booking`
| Group | Field | Notes |
|---|---|---|
| **Identity** | `id`, `bookingRef`, `idempotencyKey` (unique) | `bookingRef` is the human-readable reference shown to the user. |
| **Product** | `productCode`, `productTitle`, `productImage` | Viator-style product code; for Voyra-curated tours, app-defined code. |
| **Pricing** | `totalPrice` (IDR), `totalPriceUsd?`, `currency` (default `IDR`), `manualPrice?` | |
| **Schedule** | `travelDate` (req), `travelTime?`, `meetingPoint?`, `pax` (default 1) | |
| **Status** | `status: BookingStatus` | see §4 |
| **Viator booking** | `productOptionCode`, `productOptionTitle`, `tourGradeCode`, `startTime`, `paxMixJson`, `bookingQuestionsJson`, `languageGuide` | populated for Viator path |
| **Lead contact** | `leadFirstName`, `leadLastName`, `leadEmail`, `leadPhone` | |
| **Travellers** | `travelersJson?`, relation `travelers` (`BookingTraveler[]`) | JSON snapshot + structured rows |
| **Risk** | `isFraudFlagged` | flagged when Midtrans fraud_status=challenge |
| **Comms** | `voucherEmailed` | true once confirmation email sent |
| **Payment** | `paymentId` (unique), `snapToken`, `paidAt` | Midtrans references |
| **Viator confirmation** | `viatorBookingRef`, `viatorBookingStatus`, `viatorVoucherUrl`, `viatorBookingError`, `viatorRetryCount` | |
| **Ticket** | `ticketToken` (unique), `ticketImageUrl`, `paymentProofUrl` | |
| **Mock** | `isMockMode`, `promoCode`, `documentsJson` | |
| **Owner** | `userId` → User (cascade) | |
| **Audit** | `createdAt`, `updatedAt` | |

### 3.9 `BookingTraveler`
- `bookingRef`, `firstName`, `lastName`, `fullName`, `ageBand` (e.g. `ADULT`, `CHILD`, `INFANT`).
- Linked to `Booking` (cascade).
- `fullName` denormalised for ticket rendering.

### 3.10 `Subscription`
- UUID PK, unique email, `status` enum (string: `ACTIVE` | `UNSUBSCRIBED`), `source` (default `WEBSITE`).
- Indexed on `email` and `status`.

### 3.11 `MockBooking`
- Pre-seeded fake bookings for QA / demo. Keyed by `slug` (unique).
- Holds productCode + optional username + promoCode for shareable demo URLs.

---

## 4. Booking Status Lifecycle

```
                             ┌──────────────┐
                             │   PENDING    │  ← created (no payment yet)
                             └──────┬───────┘
              user pays online ─────┼───────► snapToken issued
                                    ▼
                             ┌──────────────┐
                             │   PAYMENT    │  ← Midtrans "pending" or manual proof uploaded
                             └──────┬───────┘
              webhook CONFIRMED ────┤        cancel/deny/expire ──┐
                                    ▼                             │
                             ┌──────────────┐              ┌──────▼──────┐
                             │  CONFIRMED   │              │  CANCELLED  │
                             └──────┬───────┘              └─────────────┘
                travelDate passed ─►│
                                    ▼
                             ┌──────────────┐
                             │  COMPLETED   │
                             └──────────────┘
```

### Transition rules

| From → To | Trigger | Effect |
|---|---|---|
| `PENDING → PAYMENT` | Snap token issued **or** admin uploads manual proof | `snapToken` or `paymentProofUrl` set |
| `PENDING / PAYMENT → CONFIRMED` | Midtrans webhook (`settlement` / `capture`+accept), or admin verifies manual proof | `paidAt` set, `ticketToken` generated, Viator confirm called, email sent, `voucherEmailed=true` |
| `* → CANCELLED` | Midtrans `cancel`/`deny`/`expire`/`refund`, user cancellation, fraud reject | Viator cancel called if applicable |
| `CONFIRMED → COMPLETED` | Cron job once `travelDate < now()` | `prisma.booking.updateMany` |

### Idempotency rules
- Webhook handler must be idempotent: if booking already `CONFIRMED` and `voucherEmailed=true`, skip re-sending.
- POSTs to `/api/bookings/*` with same `idempotencyKey` return existing booking instead of creating a duplicate.

### Auto-cleanup (per `app/api/bookings/route.ts`)
- `PENDING` bookings with a `snapToken` and older than 24h are soft-deleted on next user list call.
- Mock `PAYMENT` bookings older than 24h likewise removed.

---

## 5. Pax Mix (Viator)

`paxMixJson` is an array of `{ ageBand, numberOfTravelers }`. Age bands recognised by Viator:
- `ADULT` (typically 13+)
- `CHILD` (3–12)
- `INFANT` (0–2)
- `YOUTH`, `SENIOR`, `TRAVELER` — product-specific.

Voyra `BookingTraveler.ageBand` mirrors this string.

---

## 6. Currency

- Primary: **IDR** (Indonesian Rupiah). Stored as `Float` but treated as whole number — never sub-rupiah.
- Display: `formatPrice` in [`utils/formatPrice.ts`](../utils/formatPrice.ts).
- Conversion: `/api/viator/exchange-rates` proxies Viator rates when USD display required (`Booking.totalPriceUsd`).

---

## 7. Image Polymorphism — invariants

- An `Image` row should set **exactly one** of `destinationId / packageId / contentId / locationId`.
- When detaching, clear the FK first; only delete the row + S3 object after.
- Hero image: at most one `isMain=true` per parent (enforced in app, not DB).
- `order` is per parent — define consistently when reordering.

---

## 8. Roles & Permissions

| Role | Can |
|---|---|
| `USER` | Own profile, own bookings, public catalog |
| `EDITOR` | (not enforced today; reserved) — should map to dashboard read + content edit |
| `ADMIN` | All `/dashboard/*`, all admin APIs, override booking status, manage users |

When in doubt, gate with `if (session.user.role !== "ADMIN") return 403`.

---

## 9. Timezone

- All `DateTime` fields stored in **UTC** by Prisma/Postgres.
- `travelDate` semantics: the **calendar day in Bali (WITA, UTC+8)** the customer travels. When parsing user input, normalise to the start of that day in UTC+8 to avoid off-by-one bugs around midnight.

---

## 10. Soft delete vs hard delete

The schema uses **hard delete** everywhere via Prisma `onDelete: Cascade`. There is no `deletedAt` flag. Be deliberate before exposing destructive actions in the UI; consider adding a soft-delete column if business rules ever require recovery.

---

## 11. Engagement Subsystems

### 11.1 Trip Calendar invariants
- `CalendarEvent.date` is stored at **UTC midnight** of the user's chosen day (parsed via `parseDateOnly` in the route handler). Time-of-day lives in `startTime`/`endTime` strings (`HH:MM`) — not in `date`.
- `recurrence` is the RRULE body without the `RRULE:` prefix. Supported subset: `FREQ=DAILY|WEEKLY|MONTHLY`, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY` (weekly only). Anything else parses to `null` and the row is treated as one-off.
- `recurrenceUntil` is **inclusive** — last day on which an occurrence may fire.
- Drag-and-drop reschedule **only allowed on non-recurring** events; UI blocks recurring drags with a toast (see `app/profile/calendar/page.tsx`).
- `reminderSent` is **only used for non-recurring**. For recurring events the cron computes `nextOccurrenceAfter` and sends only when next occurrence equals tomorrow; deduplication is by push notification `tag` per-occurrence.
- Public share slug rotates: `POST /api/profile/calendar-share { enabled }` regenerates only when no slug exists; `DELETE` always rotates and disables.

### 11.2 NotificationBroadcast state machine
```
DRAFT ──(action=schedule)──► SCHEDULED ──(cron picks)──► SENDING ──► SENT
   │                            │                            │
   │                            └──(admin cancel)──► CANCELLED│
   │                                                          ▼
   └──(action=send)─────────────────────────────────► SENDING ──► FAILED (errorMessage set)
```
Invariants:
- A broadcast in `SENT` or `SENDING` is immutable — `PATCH` rejects edits.
- `sendBroadcast(id)` is idempotent: AppNotification fan-out uses `skipDuplicates` against `@@unique([broadcastId, userId])`. Re-running a `FAILED` broadcast won't double-deliver.
- `audience=USER_LIST` requires non-empty `audienceIds`; ids are validated against `prisma.user.findMany` so deleted users drop out silently.
- Channel pref gating happens per-user inside `sendBroadcast`:
  - In-app skipped if user muted that `category` in `NotificationPref.inAppMutedCategories`
  - Push always attempted if `channels.push=true` AND user has subscriptions
  - Email skipped for `category=DEAL` if `marketingEmails=false`

### 11.3 Inbox semantics
- Reads are scoped by `userId` — **never** allow cross-account access on `/api/notifications/[id]`.
- `dismissedAt` is hard-delete equivalent for the user's view (filtered out of all listings) but the row is kept until cascade on user delete. Use `DELETE` for true row removal.
- `useNotificationCount` polls every 60 s. Expensive aggregations (e.g. category breakdown) belong on a separate endpoint — keep `/count` cheap.
