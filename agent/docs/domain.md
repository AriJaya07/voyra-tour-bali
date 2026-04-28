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
