---
title: 12 · Third-Party Checklist
updatedAt: 2026-05-01
---

# 12 · Third-Party Response Checklist

> One row per external system. If a vendor changes its response shape, update the row before merging.

The aim of this file is operational: when an external service starts misbehaving, this is the fastest place to confirm "is the response shape what we expect?".

---

## Quick smoke commands

Replace placeholders with your real env values. None of these write data.

```bash
# Database
psql "$DATABASE_URL" -c 'SELECT 1'

# Viator (sandbox or prod, whichever VIATOR_API_URL points to)
curl -sS -X POST "$VIATOR_API_URL/products/search" \
  -H "exp-api-key: $VIATOR_API_KEY" \
  -H "Accept: application/json;version=2.0" \
  -H "Accept-Language: en-US" \
  -H "Content-Type: application/json" \
  --data '{"filtering":{"destination":98},"pagination":{"start":1,"count":1}}' \
  | jq '.totalCount, (.products[0]|keys)'

# Midtrans Snap (sandbox)
curl -sS -X POST "https://app.sandbox.midtrans.com/snap/v1/transactions" \
  -u "$MIDTRANS_SERVER_KEY:" \
  -H "Content-Type: application/json" \
  --data '{"transaction_details":{"order_id":"ping-1","gross_amount":1000}}' \
  | jq

# Brevo SMTP — easiest is a node one-liner
node -e "require('nodemailer').createTransport({host:process.env.SMTP_HOST,port:587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}).verify().then(()=>console.log('ok')).catch(e=>console.error(e.message))"

# AWS S3 (head)
aws s3api head-bucket --bucket "$AWS_STORAGE_BUCKET" --region "$AWS_REGION"

# Google OAuth — visit /api/auth/signin/google in a browser

# Cloudflare Turnstile — verify a known dummy token (will fail siteverify)
curl -sS -X POST "https://challenges.cloudflare.com/turnstile/v0/siteverify" \
  -d "secret=$CF_TURNSTILE_SECRET_KEY&response=dummy" | jq

# Groq
curl -sS -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"hi"}]}' \
  | jq '.choices[0].message.content'

# Bali News API (external feed)
curl -sS "$BALI_NEWS_API/destinations?limit=1" | jq '.[0]|keys'

# Web Push (only if web-push installed locally)
node -e "const w=require('web-push'); console.log(w.generateVAPIDKeys())"
```

---

## Per-vendor rows

### Viator (`exp-api-key` partner)

- **Purpose**: catalog, availability, redirect-only widget (we do not book through API on confirmed-funnel).
- **Read at**: [lib/api/viator-client.ts](../../lib/api/viator-client.ts), [lib/services/viatorService.ts](../../lib/services/viatorService.ts), [app/api/viator/route.ts](../../app/api/viator/route.ts), every file under [app/api/viator/](../../app/api/viator/).
- **Auth**: `exp-api-key: $VIATOR_API_KEY`, `Accept: application/json;version=2.0`, `Accept-Language: en-US`, `Accept-Currency` (per request).
- **Expected shapes**: see [03-viator-integrations.md](./03-viator-integrations.md) shape table.
- **Failure handling**: 401/403 → return `{ products: [], warning: "Viator API unavailable …" }`; never 500. Outbound timeout: 120 s.
- **Mock switch**: `NEXT_PUBLIC_VIATOR_MOCK_BOOKING=true` short-circuits to canned mock from [lib/viatorMock.ts](../../lib/viatorMock.ts).
- **Smoke**: command in §Quick smoke.
- **Fallback**: Viator widget redirect; manual `ImportedTrip` paste flow.

### Midtrans (Snap)

- **Purpose**: payment.
- **Read at**: [lib/services/midtransService.ts](../../lib/services/midtransService.ts), [app/api/payment/notification/route.ts](../../app/api/payment/notification/route.ts), [app/api/bookings/local/route.ts](../../app/api/bookings/local/route.ts).
- **Auth**: HTTP Basic with `$MIDTRANS_SERVER_KEY:` for transactions; webhook authenticates by signature SHA512(`order_id+status_code+gross_amount+server_key`).
- **Expected shapes**: see [02-booking-and-payment.md](./02-booking-and-payment.md) §third-party.
- **Failure handling**: webhook returns 200 with `{ message: "Acknowledged" }` even on no-op (provider stops retrying). Snap-token issue failure → 500 to client.
- **Smoke**: ping endpoint above.
- **Fallback**: none — booking aborts if Snap-token cannot be issued.

### Brevo (SMTP)

- **Purpose**: transactional + marketing email.
- **Read at**: [lib/email.ts](../../lib/email.ts), [lib/services/emailService.ts](../../lib/services/emailService.ts).
- **Failure handling**: throw; cron / route catches and logs. `EmailDelivery.meta.error` records last error.
- **Smoke**: `nodemailer.transporter.verify()` (see one-liner).
- **Fallback**: none — emails are advisory; failure logged + retry on next cron tick.

### AWS S3

- **Purpose**: image storage.
- **Read at**: [utils/common/s3.ts](../../utils/common/s3.ts), [app/api/images/route.ts](../../app/api/images/route.ts).
- **Auth**: IAM access key + secret. Bucket policy must allow public read for direct URL serving (or front with CloudFront).
- **Failure handling**: PutObject errors bubble up; route returns 500.
- **Smoke**: `head-bucket`.
- **Fallback**: Cloudinary configured but unused. Manually toggle if needed (see [docs/tech-debt.md](../docs/tech-debt.md)).

### Cloudinary (configured, dormant)

- **Purpose**: legacy/fallback image host.
- **Read at**: [utils/common/cloudinary.ts](../../utils/common/cloudinary.ts).
- **Status**: no active call sites. Keep keys present so the SDK doesn't blow up on import.

### Google OAuth

- **Purpose**: sign-in.
- **Read at**: [utils/common/auth.ts](../../utils/common/auth.ts) (`GoogleProvider`).
- **Smoke**: visit `/api/auth/signin/google` and complete the dance.
- **Fallback**: credentials provider always available.

### Cloudflare Turnstile

- **Purpose**: CAPTCHA on register / login / contact form.
- **Read at**: [utils/verifyTurnstile.ts](../../utils/verifyTurnstile.ts), client widget [@marsidev/react-turnstile](https://github.com/marsidev/react-turnstile).
- **Failure handling**: `verifyTurnstile()` returns `false` on upstream issues — login/register routes already 400 in that case. **Never** widen to allow-on-error in production.
- **Smoke**: known-bad token via siteverify (expect `success: false`).

### Groq (AI)

- **Purpose**: chat assistant, itinerary planner, concierge, cultural co-pilot, day-of-trip helper, plan refine.
- **Read at**: [components/AIChatWidget.tsx](../../components/AIChatWidget.tsx), [app/api/ai/](../../app/api/ai/).
- **Model**: `llama-3.3-70b-versatile` (kept per user preference; do not switch text endpoints away from Groq).
- **Failure handling**: 503 from upstream → `cancelReservation` refunds the user's credits, route returns 500, UI shows friendly toast.
- **Smoke**: chat completions ping above.

### Anthropic (AI vision — opt-in)

- **Purpose**: voucher reader (`/api/ai/voucher-read`) — Groq does not host vision so a second provider is required for image extraction.
- **Read at**: [app/api/ai/voucher-read/route.ts](../../app/api/ai/voucher-read/route.ts).
- **Auth**: `x-api-key: ${ANTHROPIC_API_KEY}` + `anthropic-version: 2023-06-01`.
- **Model**: `claude-haiku-4-5-20251001` (override via `AI_VISION_MODEL`).
- **Activation gate**: `ENABLE_AI_VISION=true` AND `ANTHROPIC_API_KEY` set; otherwise the route returns `503 FEATURE_DISABLED` and no spend is reserved.
- **Failure handling**: any non-2xx from Anthropic → `cancelReservation` refunds user, route returns 500.
- **Smoke**: `curl -F file=@voucher.jpg -b $COOKIE http://localhost:3000/api/ai/voucher-read` (after enabling).

### Midtrans (Snap) — AI subsystem reuse

- **Purpose**: AI subscription + top-up payments piggyback on the existing Snap integration. Order ID prefix (`AISUB-` / `AITOP-`) routes the shared webhook (`/api/payment/notification`) into `aiPaymentService` instead of `bookingService`.
- **Read at**: [lib/services/aiPaymentService.ts](../../lib/services/aiPaymentService.ts).
- **Idempotency**: `AiPayment.idempotencyKey` is unique; webhook replays do not double-grant credits.
- **Smoke**: subscribe in sandbox → verify `AiPayment.status=PAID` + grant + ledger row appear.

### Bali News API (external feed)

- **Purpose**: news + destination feed for ISR pages.
- **Read at**: [lib/newsApi.ts](../../lib/newsApi.ts).
- **Failure handling**: `revalidate: 60` plus try/catch — empty array on upstream miss.
- **Smoke**: `curl $BALI_NEWS_API/destinations`.

### Google Analytics / GTM

- **Purpose**: tracking. Loaded only after cookie consent "accepted" (event `voyra:cookie-accepted`).
- **Read at**: [components/Global/Analytics.tsx](../../components/Global/Analytics.tsx), [components/Global/Gtm.tsx](../../components/Global/Gtm.tsx).
- **Failure handling**: third-party script missing → no tracking, no app failure.

### web-push + browser push services

- **Purpose**: push notifications.
- **Read at**: [lib/services/pushService.ts](../../lib/services/pushService.ts).
- **Auth**: VAPID keys (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- **Failure handling**: missing lib/keys → `sendPushToUser` returns `{ sent: 0, skipped: "no-vapid-or-lib" }` without throwing. Per-subscription 404/410 → row pruned.
- **Smoke**: `web-push.generateVAPIDKeys()` to confirm install.
- **Fallback**: email channel still works.

---

## Adding a new vendor

1. Add a row to this file (purpose, auth, shape, failure, smoke).
2. Add the variable to [docs/environment.md §3](../docs/environment.md) and §4 template.
3. Add a test to the relevant `0X-...md` spec.
4. If the vendor is critical, surface its health on `/status` ([11-pwa-and-status.md TC-11-11](./11-pwa-and-status.md)).

---

## Build verification

This file is not built — but verify the underlying integrations still pass:

```bash
npx tsc --noEmit
npx next build
```
