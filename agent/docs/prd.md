# Product Requirements — Voyra Tour Bali

> A booking platform for Bali tours and activities. Hybrid model: own-curated tours sold via Midtrans, plus a Viator integration that resells third-party tours under the Voyra brand.

---

## 1. Vision

Be the most trusted online channel for booking Bali experiences in IDR, with a hybrid catalog that combines Voyra-curated destinations and Viator's global supply, sold through one consistent checkout.

---

## 2. Personas

### 2.1 End Traveller (primary, role `USER`)
- Indonesian or international visitor planning a Bali trip.
- Wants to browse destinations, read content, see availability, and pay in IDR.
- Expects email confirmation with a printable / scannable ticket.

### 2.2 Admin (`ADMIN`)
- Operations team. Logs in to `/dashboard`.
- Manages categories, destinations, packages, contents, locations, images.
- Reviews bookings, processes manual bookings (offline payment), uploads payment proofs and Viator vouchers.
- Manages mock bookings for QA / pre-launch demos.

### 2.3 Editor (`EDITOR`)
- Content contributor. Reserved role; permissions currently overlap with `USER` (no editor-specific gating yet — see [tech-debt.md](./tech-debt.md)).

---

## 3. Modules & User Stories

### 3.1 Catalog (public)

| Story | Acceptance |
|---|---|
| Browse categories | Homepage lists categories with hero images. Click → category page. |
| Browse destinations | `/detail/[slug]` shows destination with images, contents, locations, packages. |
| Read blog / about / FAQ | Static / ISR pages render with SEO meta. `app/sitemap.ts` and `app/robots.ts` generated. |
| Search | `/search` accepts query string; matches destination titles/slugs. |
| View Viator catalog | `/viator/*` lists Viator products; details fetched on demand. |

### 3.2 Auth

| Story | Acceptance |
|---|---|
| Register with email | Receives verification email. Cannot log in until verified. |
| Register with Google | Auto-verified; logged in immediately. |
| Login | Credentials or Google. Turnstile required for credentials. After 3 failed attempts, account locked 60 s. |
| Forgot password | `/forgot-password` → email with reset token. `/reset-password?token=...` to set new password. Token expiry enforced. |
| Logout | Clears session; redirects to `/`. |

### 3.3 Booking

| Story | Acceptance |
|---|---|
| Add traveller details | Lead traveller name + email + phone. Pax count drives `BookingTraveler` rows. |
| Pick travel date / time | Required; stored on `Booking.travelDate` (+ `travelTime`). |
| Choose payment | Online (Midtrans Snap) or manual (admin uploads proof). |
| Pay online | Snap iframe; on success, status → `CONFIRMED` via webhook. Confirmation email + ticket sent. |
| Pay manually | Status flows `PENDING → PAYMENT` once admin uploads proof; `CONFIRMED` after admin verifies. |
| Receive ticket | Email with QR-coded ticket. `/ticket/[token]` shows printable view. |
| Resend ticket | `/api/resend-ticket` resends to lead email. |
| Cancel booking | Subject to Viator cancellation policy where applicable. |
| Auto-completion | Bookings move `CONFIRMED → COMPLETED` automatically once `travelDate` passes (cron). |

### 3.4 Viator Integration

| Story | Acceptance |
|---|---|
| Browse Viator products | Search by attraction, location, schedule. Listing comes from Viator REST. |
| Check availability | Live availability for date + paxMix. |
| Get booking questions | Pre-checkout questionnaire pulled from Viator. |
| Book via Viator | Booking placed on Viator backend; `viatorBookingRef` stored. |
| Sync booking status | Cron pulls modified bookings every 6 hours; updates DB; acknowledges to Viator. |
| Mock mode | `VIATOR_MOCK_BOOKING=true` short-circuits real API for staging / demos. |

### 3.5 Admin Dashboard (`/dashboard/*`, role `ADMIN`)

| Page | Capability |
|---|---|
| `/dashboard` | KPI overview (bookings, revenue, recent activity) |
| `/dashboard/categories` | CRUD categories |
| `/dashboard/destinations` | CRUD destinations + nested contents/locations/images |
| `/dashboard/contents` | CRUD content articles per destination |
| `/dashboard/locations` | CRUD sub-locations |
| `/dashboard/images` | Manage S3-hosted images |
| `/dashboard/bookings` | View, filter, update status; upload payment proof / ticket image |
| `/dashboard/viator-mock` | Manage `MockBooking` rows for testing |
| `/dashboard/subscribers` | Manage `Subscription` (newsletter) list |
| `/dashboard/groups` | Group management (per dir presence) |

### 3.6 Newsletter

| Story | Acceptance |
|---|---|
| Subscribe | `/api/subscribe` POST stores email; idempotent on existing email. |
| Unsubscribe | Status flips to `UNSUBSCRIBED`. |

### 3.7 AI Chat

| Story | Acceptance |
|---|---|
| Chat with assistant | `AIChatWidget` floats on public pages. Uses Groq via `/api/ai`. Responses are advisory; do not place bookings. |

---

## 4. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Performance** | LCP < 2.5 s on 4G for public detail pages (rely on RSC + `<Image>` optimisation). Dashboard tables paginate >50 rows (future). |
| **Availability** | Vercel default (no SLA below platform). Webhook handler returns `200` even on no-op so Midtrans does not retry indefinitely. |
| **Security** | All credentials hashed with `bcryptjs`. Webhooks verify signatures. CAPTCHA on credential auth. CSRF mitigated by NextAuth. Brute-force lockout. |
| **Privacy** | PII (email, phone, traveller names) stored in DB; not exposed in API errors or logs. |
| **i18n** | Single locale today (English). Currency primarily IDR with USD via Viator exchange-rates endpoint. |
| **SEO** | Sitemap + robots generated. Per-page metadata via `lib/metadata.ts`. Google Search Console verification env. |
| **Observability** | `console.error` only. No external APM wired up (improvement opportunity). |

---

## 5. Acceptance Criteria — Booking Flow (canonical)

1. Authenticated user opens `/detail/[slug]` (or Viator product page).
2. Selects date / time / pax → totals computed in IDR.
3. Clicks **Book Now** → `/checkout`.
4. Fills lead traveller form → POST `/api/bookings/local` (Midtrans path) or appropriate Viator path.
5. Booking row created with `status=PENDING`, `idempotencyKey` set.
6. Snap token returned → client opens Snap UI.
7. On payment success, Midtrans posts to `/api/payment/notification`.
8. Server verifies signature, sets `status=CONFIRMED`, generates `ticketToken`, calls `viatorService.confirmBooking` if Viator, sends email.
9. User redirected to `/booking-success?bookingRef=...`.
10. Email arrives within 60 s with ticket link `/ticket/[token]`.
11. After `travelDate < now()`, nightly cron flips status to `COMPLETED`.

A booking is considered **complete** only when `voucherEmailed=true`.

---

## 6. Out of Scope (explicit non-goals)

- Multi-tenant / multi-brand support.
- Real-time chat with admins (AI only).
- Group bookings with internal split-pay between travellers.
- Refund automation (admin manual via Midtrans dashboard).
- Mobile native app.
- Third-party SSO beyond Google.
- Multi-currency display beyond IDR/USD.
- Deep loyalty/points programme.

---

## 7. Roadmap Hooks

These are *not* current features but the data model already supports them:

- **Promotions / vouchers** — `Booking.promoCode`, `MockBooking.promoCode`.
- **Document attachment per booking** — `Booking.documentsJson`.
- **Tour grades / language guides per booking** — `Booking.tourGradeCode`, `Booking.languageGuide`.
- **Manual price overrides** — `Booking.manualPrice`, `Booking.isMockMode`.

---

## 8. Glossary (cross-link)

See [domain.md](./domain.md) for full entity definitions and lifecycle.
