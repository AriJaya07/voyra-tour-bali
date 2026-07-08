# Growth Runbook — balitravelnow.com

> Companion to the 2026-07-08 turnaround plan. Code changes are in the repo; this file is the
> **human execution checklist** — the parts no code can do. Work top to bottom. Do not skip gates.

---

## 0. One rule

For the next 90 days you are a **tour seller who has a website**, not a software founder.
Target that matters: **10 strangers pay you.** Every hour of work should trace to that.

---

## 1. Week 1 — Setup (once, ~half a day)

| # | Task | How |
|---|---|---|
| 1.1 | Run pending prod migration | `npx prisma migrate deploy` against prod DB (indexes + new fields) |
| 1.2 | Microsoft Clarity | clarity.microsoft.com → new project → copy ID → set `NEXT_PUBLIC_CLARITY_ID` in Vercel env → redeploy. Free session recordings + rage-click reports. |
| 1.3 | GA4 funnel | In GA4 Admin → Events: mark `begin_checkout` and `purchase` as key events. Funnel events now fire from the site (view_item → select_date → begin_checkout → payment_open → purchase). Build one Exploration funnel report. |
| 1.4 | Error alerts | Create n8n webhook workflow (see `docs/n8n-workflows.md` §1) → set `N8N_ERROR_WEBHOOK_URL` in Vercel. Client+server errors now land in your Telegram/email. |
| 1.5 | WhatsApp Business | Install WhatsApp Business app on phone, business profile with logo. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` (e.g. `6281234567890`) in Vercel → sticky button goes live. |
| 1.6 | Abandoned-checkout recovery | n8n workflow §2 + set `N8N_ABANDONED_WEBHOOK_URL`. |
| 1.7 | Cross-browser QA | iPhone Safari + Android Chrome + desktop: homepage → tour → checkout → pay (Midtrans sandbox). Log breaks in `agent/docs/tech-debt.md`. Fix ONLY checkout-path bugs. |

## 2. Weeks 1–2 — Manual QA + first sales attempts

- Respond to EVERY WhatsApp message < 15 min during Bali daytime. Speed is the product.
- Post one genuinely helpful answer per day: r/bali, TripAdvisor Bali forum, 2–3 Facebook Bali travel groups. No links first 2 weeks — build account karma. Then link only when directly relevant.
- Watch 10 Clarity session recordings per week. Write down every rage-click / dead-end. Fix top 3.

## 3. Month 1 — Supply (the real business)

Reselling Viator at parity = ~8% affiliate cut of someone else's product. Own supply = 20–35% margin + a moat.

1. List 10 candidate operators: private drivers with good cars, Nusa Penida boat, Ubud cultural experiences, cooking class. Sources: personal network, TripAdvisor small operators with <50 reviews (hungry), Facebook groups.
2. Pitch: "I bring you international bookings, prepaid, zero marketing cost to you. You give me net rate 20–30% below your walk-in price and priority availability."
3. Sign 3–5. Simple 1-page agreement: net rate, payout terms (weekly transfer), cancellation policy, WhatsApp contact.
4. Enter as Destinations/Packages with real photos (go shoot them — one day with a phone). Price BELOW the Viator-equivalent tour.
5. Track per-booking margin in the new `costPrice` field (admin form) — profit per booking must be visible.

## 4. Month 2 — Demand

| Channel | Action | Budget |
|---|---|---|
| SEO content | 2–3 original guides/week via n8n pipeline (§3 of n8n doc) + your edit. Priorities: ceremony calendar pages (Nyepi 2027, Galungan dates), "Nusa Penida day trip cost", regency guides. NO syndicated content — delete or noindex existing duplicate blog posts. | time |
| Google Ads | Exact-match long-tail only: "nusa penida private tour", "bali private driver english speaking", "ubud tour from seminyak". $10–15/day. Kill any keyword with $50 spend and 0 begin_checkout. | ~$400/mo |
| Villa partnerships | 10 villas/guesthouses in Canggu/Ubud/Seminyak. Offer 10% commission via QR code with `?ref=` param. Print 50 cards. | ~$20 |
| Google Business Profile | Register the business, category "Tour operator". Collect reviews there from every completed booking. | free |

## 5. Ongoing — Retention that fits tourists

- Every confirmed booking → WhatsApp thread for whole trip. Day before: reminder + weather. Day after: "want tomorrow's plan?" (cross-sell window = the trip itself).
- Post-trip n8n flow (§4): review request (Google Business first, then site) + friend-referral code.
- Monthly newsletter only to non-bookers who subscribed (planning cycles are 1–6 months).

## 6. Decision gates — hold yourself to these

| Date | Signal required | If missed |
|---|---|---|
| **2026-08-07** (day 30) | Funnel visible in GA4, checkout bug-free on 3 browsers, reviews live, guest checkout live, WhatsApp answering | Execution problem. Fix before spending on ads. |
| **2026-09-06** (day 60) | ≥500 visitors/mo AND ≥5 paid bookings (manual WhatsApp closes count) | Offer/trust problem. Message 20 visitors who abandoned; ask why. Adjust offer, not code. |
| **2026-10-06** (day 90) | ≥15 bookings/mo, ≥1 repeatable channel, positive margin on own supply | Pivot options: (a) B2B tooling for Bali operators (booking+payout SaaS — you've built 80%), (b) narrow to ceremonies/cultural niche, (c) shut down cleanly. Decide with data, not hope. |

## 7. On the billionaire goal

Bali tours is a niche. Executed perfectly this becomes a $50k–500k/yr profit business — real wealth for reinvestment, and it teaches distribution, supply, unit economics. Nobody becomes a billionaire from plan; they become one from surviving long enough to compound wins. Milestone 1: 10 paying strangers. Milestone 2: $5k/mo profit. Milestone 3: decide what to scale. In that order.
