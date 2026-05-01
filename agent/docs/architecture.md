# Architecture — Voyra Tour Bali

> System architecture, design decisions, and component relationships.
> Stack: **Next.js 16 (App Router) · React 19 · TypeScript · Prisma · PostgreSQL · NextAuth · TanStack Query · Tailwind v4**

---

## 1. High-Level Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │
│  │ Public pages   │  │ Auth pages     │  │ Dashboard (admin SPA)  │ │
│  │ (RSC)          │  │ login/register │  │ /dashboard/*           │ │
│  └────────────────┘  └────────────────┘  └────────────────────────┘ │
│        │                    │                       │               │
│        ▼                    ▼                       ▼               │
│   TanStack Query  ─────► axios (/api/*)   ─────► Zustand (client)   │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS
┌──────────────────────────────────────────────────────────────────────┐
│                Next.js 16 Route Handlers (Server)                    │
│ ┌──────────────┐ ┌────────────┐ ┌─────────────┐ ┌────────────────┐  │
│ │ /api/auth    │ │ /api/CRUD  │ │ /api/viator │ │ /api/payment   │  │
│ │ NextAuth     │ │ dest/cat/.. │ │ proxy/sync  │ │ Midtrans hook │  │
│ └──────────────┘ └────────────┘ └─────────────┘ └────────────────┘  │
│ ┌──────────────┐ ┌────────────┐ ┌─────────────┐ ┌────────────────┐  │
│ │ /api/bookings│ │ /api/cron  │ │ /api/ai     │ │ /api/admin     │  │
│ │ user-scoped  │ │ scheduled  │ │ Groq chat   │ │ admin-scoped   │  │
│ └──────────────┘ └────────────┘ └─────────────┘ └────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
       │              │              │            │             │
       ▼              ▼              ▼            ▼             ▼
  ┌─────────┐   ┌─────────┐   ┌──────────┐  ┌─────────┐   ┌─────────┐
  │ Prisma  │   │ AWS S3  │   │ Viator   │  │Midtrans │   │ Brevo   │
  │ Postgres│   │ images  │   │ REST API │  │ Snap    │   │ SMTP    │
  └─────────┘   └─────────┘   └──────────┘  └─────────┘   └─────────┘
```

---

## 2. Rendering Strategy

| Surface | Mode | Why |
|---|---|---|
| `app/page.tsx`, `app/about`, `app/blog`, `app/detail` | **RSC + ISR (60s)** via `lib/newsApi.ts` | SEO-critical public content, low write rate |
| `app/dashboard/*` | **CSR over RSC shell** | Admin SPA pattern; React Query owns state |
| `app/login`, `/register`, `/profile` | **CSR** (form-driven) | Stateful, requires `signIn()` calls |
| `app/api/*` | **Route Handlers (Node runtime)** | Need Prisma + Node SDKs (S3, Midtrans, Nodemailer) |
| `app/layout.tsx` | **Server Component** — `getServerSession(authOptions)` injected into `<AppProviders session>` | Hydrate session once, share via NextAuth `useSession` |

`next.config.ts` permits remote images from S3 (`*.s3.ap-southeast-2.amazonaws.com`), Cloudinary, TripAdvisor and Viator CDNs. WebP conversion handled by Next `<Image>`; on Vercel free tier, `unoptimized` is set on hot paths to bypass quota (see commit `f48e677`).

---

## 3. Module Layout

```
voyra-tour-bali/
├── app/                    # Routes (App Router)
│   ├── api/                # Route handlers — see api-patterns.md
│   ├── dashboard/          # Admin CMS (ADMIN-only via middleware)
│   └── (public pages)/     # Marketing + booking flow
├── components/
│   ├── Dashboard/          # Admin forms + tables (CategoryForm, DestinationForm, …)
│   ├── Homepage/ Navbar/ Footer/ ...
│   ├── booking/ checkout/ payment/   # Booking funnel UI
│   ├── viator/             # Viator product views
│   ├── providers/          # AppProviders, SessionProvider, ReactQueryProvider
│   └── ui/                 # Primitives (button, modal, …)
├── lib/                    # Server-side libs (cross-route)
│   ├── prisma.ts           # PrismaClient singleton
│   ├── auth.ts             # NextAuth options entrypoint
│   ├── axios.ts            # Browser axios instance (baseURL "/api")
│   ├── email.ts            # Nodemailer (Brevo SMTP)
│   ├── ticket.ts           # Ticket token + QR
│   ├── config/             # midtrans, viator, payment config
│   ├── services/           # Server services: bookingService,
│   │                       #   midtransService, viatorService,
│   │                       #   postPaymentService, viatorSyncService
│   └── api/                # Outbound API clients (viator-client.ts, profile.ts)
├── utils/
│   ├── hooks/              # React Query hooks (useDestinations, useBookings, …)
│   ├── service/            # Browser-side service wrappers (axios → /api)
│   └── common/             # auth helpers, middleware, s3, cloudinary
├── prisma/
│   ├── schema.prisma       # Source of truth for DB
│   ├── migrations/         # Migration history
│   └── seed.ts             # Seeds first ADMIN user
├── types/                  # Shared TS types (booking, tourism, blog, …)
└── proxy.ts                # Acts as the Next.js middleware entry — re-exports utils/common/middleware
                            # AND declares `export const config.matcher` (must be statically analyzable)
```

**Three layers, top-down:**

1. **Route handlers** (`app/api/**/route.ts`) — thin, validate input, call service, shape JSON.
2. **Service layer** — `lib/services/*` for booking + payment + Viator orchestration; `utils/service/*` for browser-side CRUD wrappers.
3. **Data layer** — Prisma ORM + outbound HTTP (Viator, Midtrans, Brevo, S3).

> **Known split:** `lib/services/` (server orchestration) vs `utils/service/` (browser axios wrappers). Different audiences, similar names. See [tech-debt.md](./tech-debt.md).

---

## 4. Data Flow Examples

### 4.1 Admin creates a destination
```
DestinationForm (CSR)
  → useDestinations.createDestination (React Query mutation)
  → utils/service/destination.service.ts (axios POST /api/destinations)
  → app/api/destinations/route.ts (POST)
       ├── prisma.destination.create()
       ├── Promise.all(prisma.image.update(...))         ← link pre-uploaded S3 images
       ├── Promise.all(prisma.content.create + images)
       └── Promise.all(prisma.location.create + images)
  → return 201 with full nested entity
  → React Query invalidates ["destinations"] → table refetch
```
Images are **uploaded to S3 first** (separate `/api/images` POST), the returned `Image` row id is then attached during destination create.

### 4.2 User books a tour (Midtrans path)
```
DetailProduct → Checkout (CSR)
  → POST /api/bookings/local
     ├── auth: getServerSession
     ├── prisma.booking.create({ status: PENDING, idempotencyKey })
     ├── prisma.bookingTraveler.createMany
     └── lib/services/midtransService → snap.createTransaction → snapToken
  → client opens Snap.js (window.snap.pay)
  → Midtrans → POST /api/payment/notification (server-to-server webhook)
       ├── verify SHA512(orderId+statusCode+grossAmount+SERVER_KEY)
       ├── map status → BookingStatus
       └── if CONFIRMED: postPaymentService.handlePaymentSuccess
            ├── generate ticketToken
            ├── viatorService.confirmBooking (if applicable)
            └── lib/email.sendBookingConfirmation
  → user redirected to /booking-success
```

### 4.3 Viator availability lookup
```
Detail page → useViator → POST /api/viator/availability
  → if VIATOR_MOCK_BOOKING=true → return canned data
  → else: lib/api/viator-client.ts → POST {VIATOR_API_URL}/availability
       AbortSignal.timeout(120_000)
       headers: exp-api-key, Accept-Language
  → reshape to { available, slots[], bookableItems[] }
```

---

## 5. Auth Architecture

- **NextAuth v4** (`utils/common/auth.ts`, re-exported via `lib/auth.ts`).
- Providers:
  - `CredentialsProvider` — email + password (`bcryptjs`) + Cloudflare Turnstile token (`utils/verifyTurnstile.ts`).
  - `GoogleProvider` — OAuth (id + secret from env).
- **Session**: JWT strategy. `session.user` extended in `types/next-auth.d.ts` with `id`, `role`.
- **Brute-force protection**: `User.loginAttempts`, `User.loginLockedUntil`. Lockout after 3 failed attempts for 60 s. Resets on success.
- **Email verification gate**: `USER` role with `emailVerified=false` cannot sign in. `ADMIN` / `EDITOR` exempt.
- **Route protection** (`utils/common/middleware.ts` re-exported by `proxy.ts`):
  | Pattern | Required role |
  |---|---|
  | `/dashboard/:path*` | `ADMIN` |
  | `/profile`, `/profile/:path*` | authenticated |
  | `/checkout` | authenticated |
  | `/payment/:path*` | authenticated |

---

## 6. Database

- **PostgreSQL** via Prisma ORM v6. Schema in [prisma/schema.prisma](../prisma/schema.prisma).
- Singleton client (`lib/prisma.ts`) — reused via `globalThis.prisma` in non-prod to survive HMR.
- Cascading deletes:
  - `Destination → Content/Location/Image` = CASCADE
  - `Destination → Package` = SET NULL on category, no cascade on destination
  - `Category → Destination/Package` = SET NULL
- Migrations applied at deploy via `prisma migrate deploy` (Vercel build hook recommended in README).

---

## 7. State Management

| Concern | Tool | Notes |
|---|---|---|
| Server cache | **TanStack React Query v5** | All `utils/hooks/use*` files |
| Cross-form transient state | **Zustand** | `useBookingStore` for cart/checkout draft |
| Form local | `useState` / uncontrolled | No react-hook-form / zod |
| Auth | NextAuth `useSession` | Hydrated via `<SessionProvider session>` from layout |

React Query defaults: provider in `components/providers/ReactQueryProvider.tsx`. Most queries use default `staleTime` (Viator availability cached ~5 min via component-level config).

---

## 8. Storage & CDN

- **AWS S3** is the active image store: bucket configured via `AWS_STORAGE_BUCKET` in region `ap-southeast-2`. Helpers in [utils/common/s3.ts](../utils/common/s3.ts) — `uploadImageToS3`, `deleteImageFromS3`.
- **Cloudinary** SDK is installed and configured (`utils/common/cloudinary.ts`) but no active call sites. Treated as fallback / legacy.
- Public asset pattern: `https://{BUCKET}.s3.{REGION}.amazonaws.com/{key}` consumed by `<Image>` (configured in `next.config.ts:remotePatterns`).

---

## 9. External Integrations

| System | Purpose | Entry point |
|---|---|---|
| **Viator REST API** | Product, availability, exchange rates, reviews. **Booking is redirect-only via the widget**; confirmation comes back through cron sync or the manual `ImportedTrip` paste flow. | `lib/api/viator-client.ts`, `lib/services/viatorService.ts`, `lib/config/viator.ts` |
| **Midtrans Snap** | Payment gateway (IDR) | `lib/services/midtransService.ts`, `lib/config/midtrans.ts`, `app/api/payment/notification/route.ts` |
| **Brevo SMTP** (Nodemailer) | Verification, password reset, ticket email, marketing. Wrapped by `lib/services/emailService.sendTrackedEmail` which writes `EmailDelivery` rows + injects open-pixel + click-redirect URLs. | `lib/email.ts`, `lib/services/emailService.ts`, `app/api/email/open/route.ts`, `app/api/email/click/route.ts` |
| **Cloudflare Turnstile** | CAPTCHA on login/register | `utils/verifyTurnstile.ts`, `@marsidev/react-turnstile` |
| **Groq** | AI chat assistant + itinerary planner (`llama-3.3-70b-versatile`) — kept by user direction; do not switch to Anthropic | `components/AIChatWidget.tsx`, `app/api/ai` |
| **Bali News API** | External news / activities feed | `lib/newsApi.ts` (ISR 60 s) |
| **Google Analytics / GTM** | Tracking — loads only after cookie consent `accepted` (via `voyra:cookie-accepted` event) | `components/Global/Analytics.tsx`, `components/Global/Gtm.tsx` |
| **Web Push** (`web-push` lib + browser push services) | Notifications. Lazy-loaded so absent lib/keys are a no-op. VAPID env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `lib/services/pushService.ts`, `app/api/push/subscribe/route.ts`, `app/api/push/vapid/route.ts`, `public/sw.js` (push + notificationclick handlers) |

---

## 10. Cron Jobs

Routes under `app/api/cron/*`. Each requires `Authorization: Bearer ${CRON_SECRET}`. Scheduled by Vercel Cron (config not in repo — managed in dashboard).

| Route | Job |
|---|---|
| `/api/cron/auto-complete-bookings` | `CONFIRMED → COMPLETED` once `travelDate < now()` |
| `/api/cron/cleanup-booking-tokens` | Clear ticket tokens past retention window |
| `/api/cron/cleanup-recently-viewed` | Delete `RecentlyViewedItem` rows older than 24 h |
| `/api/cron/abandoned-wishlist` | Marketing nudge to users with idle wishlist (gated by `NotificationPref.marketingEmails`) |
| `/api/cron/trip-anniversary` | "1 year ago you visited Bali" outreach |
| `/api/cron/trip-reminders` | T-1 day reminder email |
| `/api/cron/nyepi-reminder` | Day-of-Silence heads-up to upcoming travelers |
| `/api/cron/volcano-alert` | Volcano status escalation push + email |
| `/api/cron/weather-alert` | Severe weather notice for nearby travel dates |
| `/api/cron/viator-sync` | Pull modified bookings from Viator, ack |
| `/api/cron/viator-products-sync` | Detect modified products |
| `/api/cron/viator-daily-sync` | Daily reconciliation |

---

## 11. Build & Deployment

- **Hosting**: Vercel.
- **Build**: `next build` (postinstall runs `prisma generate`).
- **DB migrations**: Run `prisma migrate deploy` against prod **before** rolling code (or wire into build script — see README).
- **Env strategy**: `.env.local` for local, `vercel env pull` to sync, prod values set in Vercel dashboard.

---

## 12. Design Decisions (Why)

1. **App Router over Pages Router** — colocation of route + handler + layout, plus RSC for SEO pages.
2. **Prisma over raw SQL** — type safety end-to-end; `@prisma/client` types feed React Query payloads.
3. **NextAuth Credentials + Google** — no third-party identity provider lock-in; admin can self-serve via seed.
4. **Midtrans only** — Indonesian market; previously had Mayar (commit `a99446c` removed it).
5. **Server webhooks for payment** — never trust client-confirmed payment; Midtrans signature verified server-side.
6. **S3 over Cloudinary** — predictable cost + control; Cloudinary kept as escape hatch.
7. **No ORM transactions on bulk image link** — current codepath uses `Promise.all` for parallelism. Acknowledged in [tech-debt.md](./tech-debt.md).
8. **No automated tests** — speed of iteration prioritised; QA is manual. See [testing-strategy.md](./testing-strategy.md) for the recommended path forward.

---

## 13. Where to look

| Question | File |
|---|---|
| How is a request authorised? | `utils/common/auth.ts`, `utils/common/middleware.ts` |
| How is the DB schema defined? | `prisma/schema.prisma` |
| How is a booking created? | `app/api/bookings/local/route.ts` → `lib/services/bookingService.ts` |
| How is payment confirmed? | `app/api/payment/notification/route.ts` → `lib/services/postPaymentService.ts` |
| How is a tour fetched from Viator? | `lib/api/viator-client.ts`, `app/api/viator/**` |
| How are images uploaded? | `app/api/images/route.ts` → `utils/common/s3.ts` |
| How is loyalty earned/redeemed? | `lib/services/postPaymentService.ts` (earn), `app/api/loyalty/redeem/route.ts` (redeem) |
| How does referral conversion fire? | `app/api/auth/register/route.ts` (signup leg) + `lib/services/postPaymentService.ts` (conversion leg on first CONFIRMED booking) |
| How do tracked emails work? | `lib/services/emailService.ts` → writes `EmailDelivery`, injects pixel + click rewriter |
| How do push notifications work? | `lib/services/pushService.ts` (lazy `web-push`) + `public/sw.js` (push + notificationclick) |
| What's in `/compare` / `/notes` / `/bali-events` / `/guides/profiles`? | Phase 16+ pages — see `app/compare/page.tsx`, `app/notes/page.tsx`, `app/bali-events/page.tsx`, `app/guides/profiles/[slug]/page.tsx` |
| Where do test specs live? | [test-user/](../test-user/) (one file per feature area) |
| What environment variables exist? | [environment.md](./environment.md) |
