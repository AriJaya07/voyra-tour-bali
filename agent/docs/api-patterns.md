# API Patterns — Voyra Tour Bali

> Conventions for `app/api/**/route.ts`. Read before adding or modifying any endpoint.

---

## 1. URL & File Layout

| Pattern | File | Notes |
|---|---|---|
| Collection | `app/api/<entity>/route.ts` | `GET` (list), `POST` (create) |
| Item | `app/api/<entity>/[id]/route.ts` | `GET`, `PUT`/`PATCH`, `DELETE` |
| Sub-action | `app/api/<entity>/<verb>/route.ts` | `app/api/bookings/retry/route.ts` |
| Webhook | `app/api/<provider>/notification/route.ts` | `app/api/payment/notification/route.ts` |
| Cron | `app/api/cron/<job>/route.ts` | Auth via `CRON_SECRET` |
| Admin-only | `app/api/admin/<entity>/route.ts` | Role check `ADMIN` inside handler |

Route segments: **kebab-case**. Dynamic segments: `[id]`, `[slug]`, `[...nextauth]`.

---

## 2. Handler Skeleton

```ts
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/utils/common/auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // 1. Auth (if protected)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse query
    const categoryId = req.nextUrl.searchParams.get("categoryId");

    // 3. Query
    const items = await prisma.entity.findMany({
      where: categoryId ? { categoryId: Number(categoryId) } : {},
      include: { /* relations */ },
      orderBy: { createdAt: "desc" },
    });

    // 4. Respond
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching <entity>:", error);
    return NextResponse.json(
      { error: "Failed to fetch <entity>" },
      { status: 500 }
    );
  }
}
```

Keep the four-step shape: **Auth → Parse → Work → Respond**.

---

## 3. HTTP Verb Conventions

| Verb | Use | Returns |
|---|---|---|
| `GET` | List or read | `200` + JSON (array or object). `404` if not found by id. |
| `POST` | Create or non-idempotent action | `201` + created entity, or `200` + `{ message, ...data }` for action endpoints. |
| `PUT` | Replace whole entity | `200` + updated entity |
| `PATCH` | Partial update / status change | `200` + `{ message, booking }` or updated entity |
| `DELETE` | Remove | `200` + `{ message: "Deleted" }`. Cascade through Prisma `onDelete`. |

Webhooks (Midtrans) only accept `POST`. They must return `200` with `{ message: "Acknowledged" }` even on no-op so the provider stops retrying.

---

## 4. Status Codes

| Code | When |
|---|---|
| `200` | Success (read, update, delete, webhook ack) |
| `201` | Resource created |
| `400` | Validation failed — `{ error: "<field> required" }` |
| `401` | No session / no auth header |
| `403` | Authenticated but wrong role, or signature mismatch |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate `slug`) |
| `429` | Rate limit (currently only login lockout) |
| `500` | Unexpected — error already logged via `console.error` |

Do **not** use `2xx` to signal "success but failed business rule". Use `4xx` with a clear message.

---

## 5. Request / Response Shapes

### 5.1 Request body
- JSON. `await req.json()`. No FormData except for image uploads (`/api/images`).
- Field names: `camelCase`. Booleans literal (`true`/`false`). Dates as ISO 8601 strings (`new Date(input)` server-side).
- Numeric inputs may arrive as strings — coerce with `Number(x)` and reject `NaN`.

### 5.2 Success response
- **Single entity**: bare object — `NextResponse.json(entity)`.
- **List**: bare array — `NextResponse.json(items)`.
- **Action result**: `{ message: string, ...payload }`.
- Include relations the caller will need (avoid N+1 round trips). Match the `include` shape used in `GET`.

### 5.3 Error response
Canonical shape:

```json
{ "error": "Human readable reason" }
```

No nested error objects, no error codes, no `details`, no stack. Status code carries the type.

> **Legacy exception**: `app/api/auth/*` routes (`register`, `forgot-password`, `reset-password`, `resend-verification`) return `{ message: "..." }` for both success and failure. The login/register form components read `data.message`. Do **not** change the shape without updating the matching UI in lockstep. New auth endpoints use `{ error }`. See [tech-debt.md §4.3](./tech-debt.md).

---

## 6. Authentication & Authorisation

| Need | Pattern |
|---|---|
| Public read | No check |
| Authenticated user | `const session = await getServerSession(authOptions); if (!session) return 401` |
| Admin only | Above + `if (session.user.role !== "ADMIN") return 403` |
| Cron | `if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return 401` |
| Webhook | Provider-specific signature verification (see §8) |

Dashboard routes are protected by `middleware.ts` at the **page** level, but every admin **API** route must still check the role inside the handler — middleware does not run on the API matcher.

---

## 7. Validation

No schema library is in use. Validate manually:

```ts
const { title, description, price, categoryId } = body;

if (!title || !description || price === undefined || price === null || !categoryId) {
  return NextResponse.json(
    { error: "Title, description, price, and category are required" },
    { status: 400 }
  );
}
```

Recommendation for new code: introduce `zod` per-route. Until then, follow the manual pattern above and validate **every** required field.

Always:

- Coerce numeric inputs (`Number(x)`) before passing to Prisma.
- Parse dates explicitly (`new Date(input)`).
- Treat untrusted strings as `string | undefined` — never deref blindly.

---

## 8. Webhooks

### Midtrans (`app/api/payment/notification/route.ts`)

1. Read `order_id`, `status_code`, `gross_amount`, `signature_key` from the body.
2. Compute `sha512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`.
3. Reject with `403` if mismatch.
4. Map `transaction_status` → `BookingStatus`:
   | Midtrans | Internal |
   |---|---|
   | `capture` (fraud `accept`) | `CONFIRMED` |
   | `capture` (fraud `challenge`) | `PENDING` (flag fraud) |
   | `settlement` | `CONFIRMED` |
   | `pending` | `PAYMENT` |
   | `cancel` / `deny` / `expire` | `CANCELLED` |
   | `refund` / `partial_refund` | `CANCELLED` |
5. On `CONFIRMED`, call `handlePaymentSuccess(bookingId)`.
6. Always respond `200 { message: "Acknowledged" }`.

### Cron jobs

Header: `Authorization: Bearer ${CRON_SECRET}`. Validate first — return `401` immediately on mismatch.

---

## 9. Outbound HTTP

When calling Viator (or any third party) from a route:

```ts
const res = await fetch(`${process.env.VIATOR_API_URL}/availability`, {
  method: "POST",
  headers: {
    "exp-api-key": process.env.VIATOR_API_KEY!,
    "Accept": "application/json;version=2.0",
    "Accept-Language": "en-US",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(120_000), // always set a timeout
});
```

- **Always** pass `AbortSignal.timeout(...)` to outbound `fetch`.
- Wrap in `try/catch`; on failure return `502` with `{ error: "Upstream unavailable" }`.
- Honour `VIATOR_MOCK_BOOKING=true` to short-circuit with canned data — gate behind `lib/config/viator.ts`.

---

## 10. Pagination

Most list endpoints currently return everything. When adding pagination:

- Query: `?page=1&pageSize=20`.
- Response: `{ items: T[], total: number, page: number, pageSize: number }`.
- Use Prisma `skip` + `take`. Never load the full table for `total` — use `prisma.entity.count({ where })`.

---

## 11. Idempotency

- `Booking.idempotencyKey` is `@unique`. Booking POSTs that include this key must `findUnique` first and return the existing row instead of creating a duplicate.
- Webhooks should be idempotent by design — never increment counters or send emails without checking current state (`if (booking.status === "CONFIRMED" && booking.voucherEmailed) return ack`).

---

## 12. CORS / Headers

- All API routes are **same-origin**. No CORS headers configured. If you need to expose an endpoint to a third party, add explicit `Access-Control-Allow-*` and document why.
- Webhook routes must **not** enforce CSRF / referer checks — providers come from external IPs.

---

## 13. Worked Examples

### 13.1 Simple CRUD — `app/api/categories/route.ts`

```
GET  /api/categories
  → 200 [{ id, name, slug, description, image, _count: { destinations, packages } }, ...]

POST /api/categories
  body { name, slug, description?, image? }
  → 400 if !name || !slug
  → 409 if slug exists
  → 201 { id, name, slug, ... }
```

### 13.2 Nested create — `app/api/destinations/route.ts`

```
POST /api/destinations
  body {
    title, description, price, categoryId, slug?,
    images?:   [{ id, altText?, isMain?, order? }],
    contents?: [{ title, subTitle?, description, dateAvailable, isAvailable,
                  images?: [...] }],
    locations?:[{ title, description?, hrefLink?, images?: [...] }]
  }
  → 400 if required fields missing
  → 201 destination with nested category, images, packages, contents.images, locations.images
```

✅ Wrapped in `prisma.$transaction(async (tx) => { ... })` since the audit pass — partial failures roll back. New nested-create endpoints **must** continue to use `$transaction`.

### 13.3 User-scoped list — `app/api/bookings/route.ts`

```
GET /api/bookings
  auth required
  → 200 [{ booking with travelers }, ...]
  Side effects:
    - Triggers Viator status sync (if VIATOR_API_KEY set)
    - Soft-deletes expired unpaid bookings (PENDING with snapToken,
      or mock PAYMENT older than 24h)

PATCH /api/bookings
  auth required
  body { bookingRef, status }
  → 400 if missing
  → 404 if booking not owned by session user
  → 200 { message, booking }
```

### 13.4 Webhook — `app/api/payment/notification/route.ts`

```
POST /api/payment/notification
  body { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, ... }
  → 403 if signature mismatch
  → 404 if booking not found by order_id
  → 200 { message: "Acknowledged" }
  Side effects:
    - update booking.status
    - on CONFIRMED: handlePaymentSuccess (ticket + Viator confirm + email)
```

### 13.5 Outbound proxy — `app/api/viator/availability/route.ts`

```
POST /api/viator/availability
  body { productCode, productOptionCode?, travelDate, paxMix, currency }
  Mock mode (VIATOR_MOCK_BOOKING=true):
    → 200 { available: true, productCode, slots: [...mock], _mock: true }
  Real:
    → fetch upstream w/ 120s timeout
    → 200 { available, productCode, slots, bookableItems }
    → 502 on upstream failure
```

---

## 14. Anti-patterns

- ❌ Returning `200` with `{ error }` and using only the body for failure signalling.
- ❌ Throwing inside a route handler (always `return`).
- ❌ Catching errors silently (always `console.error` then return `500`).
- ❌ Trusting `body` shape without validation.
- ❌ `Promise.all` for writes that must be atomic.
- ❌ Calling outbound HTTP without a timeout.
- ❌ Returning Prisma errors verbatim — they leak schema info.
