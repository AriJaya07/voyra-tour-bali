# n8n Workflows — balitravelnow.com

> Build these in your n8n instance (Contabo). Each section = one workflow.
> Site-side endpoints/env vars referenced here already exist in the codebase (2026-07-08 changes).

Env vars to set in Vercel after creating the webhooks:

| Var | Purpose |
|---|---|
| `N8N_ERROR_WEBHOOK_URL` | receives client/server error reports |
| `N8N_ABANDONED_WEBHOOK_URL` | receives abandoned-checkout events from cron |
| `N8N_POSTTRIP_WEBHOOK_URL` | receives completed-booking events from cron |

All three POST JSON. Protect each n8n webhook with a header token if exposed publicly
(n8n Webhook node → Authentication: Header Auth), and put the same token in
`N8N_WEBHOOK_TOKEN` — the site sends it as `x-webhook-token`.

---

## 1. Error alerting

**Trigger:** Webhook (POST) ← site sends `{ source, message, url, userAgent, stack?, ts }`

**Flow:**
1. Webhook
2. Filter: drop noise (message contains "ResizeObserver", "Script error.", "Load failed" from bots)
3. Telegram node (or Gmail): send `⚠️ {{source}} {{message}} — {{url}} — {{userAgent}}`
4. Optional: Google Sheets append for a running error log

Purpose: replaces Sentry at $0 until volume justifies Sentry.

## 2. Abandoned checkout recovery

**Trigger:** Webhook (POST) ← daily cron `/api/cron/abandoned-checkout` sends, per booking:
`{ bookingRef, productTitle, totalPrice, leadEmail, leadFirstName, leadPhone, travelDate, checkoutUrl }`

**Flow:**
1. Webhook
2. Wait 0 (already 1h+ old when cron fires)
3. Gmail/Brevo SMTP node — template:
   - Subject: `Your {{productTitle}} date is still available`
   - Body: friendly, one CTA link `{{checkoutUrl}}`, mention WhatsApp number for questions.
4. IF `leadPhone` present → optional WhatsApp Cloud API / manual task list (Google Sheet "call these today").
5. Google Sheets append → recovery tracking (bookingRef, sent date). n8n dedup: use bookingRef as key, skip if already in sheet.

## 3. Content pipeline (SEO engine)

**Trigger:** Schedule (Mon/Wed/Fri 06:00 WITA) or manual.

**Flow:**
1. Google Sheets: read next row from "content-queue" (columns: topic, keyword, type[guide|ceremony|comparison], status=todo)
2. HTTP → Anthropic Messages API (`claude-sonnet-5`) — prompt:
   - "Write a 1,200-word original Bali guide on {{topic}} targeting keyword {{keyword}}. First-hand local perspective, current 2026 prices in IDR, practical logistics (how to get there, cost, timing), one FAQ section. No fluff intro. Output markdown with H2/H3."
3. Gmail: send draft to you for edit (NEVER publish unedited — thin AI content gets penalized)
4. Mark row status=drafted
5. You edit → publish via dashboard → mark published

Queue seed (priority order): Nyepi 2027 guide · Galungan/Kuningan 2026-2027 dates · Nusa Penida day trip full cost breakdown · Private driver vs group tour · Ubud 2-day itinerary · Airport→Ubud transport options · Tanah Lot vs Uluwatu sunset · Bali with toddler logistics.

## 4. Post-trip review + referral

**Trigger:** Webhook ← daily cron `/api/cron/post-trip` sends per booking completed yesterday:
`{ bookingRef, productTitle, leadEmail, leadFirstName }`

**Flow:**
1. Webhook
2. Email: "How was {{productTitle}}?" → CTA 1: Google Business review link (get it from your GBP profile). CTA 2: "Friends going to Bali? Share this code."
3. Sheets append for tracking.

## 5. Daily digest (optional, 5 min build)

Schedule 21:00 WITA → HTTP GET your GA4 / DB summary → Telegram: bookings today, revenue, begin_checkouts, top page. Keeps you looking at numbers daily.
