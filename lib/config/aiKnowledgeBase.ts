/**
 * Voyra knowledge base — single source of truth that the AI assistant
 * (`/api/ai/chat` + `/api/ai/concierge`) injects into its system prompt so
 * users get accurate answers about features, credit system, navigation, and
 * pricing. Keep tight; this counts toward every chat call's token budget.
 *
 * Editing this file changes the AI's grounding instantly — no prompt
 * archaeology required.
 */

export const VOYRA_KNOWLEDGE_BASE = `
VOYRA WEBSITE — KNOWLEDGE BASE (use these facts when users ask about credits, plans, features, or how the site works).

PAGES + WHERE THINGS LIVE — user-friendly names + breadcrumb path
When pointing users to a page, use the friendly name first; add the path in soft brackets if helpful (e.g. "AI Wallet (Profile → AI Wallet)"). Never dump a raw URL like "/profile/ai".

- "Home" — Voyra homepage (tour search + AI hero + featured destinations).
- "About" — About Voyra (Profile → top menu).
- "Plans" — Pricing page (subscription plans + top-up packs + FAQ + usage calculator).
- "Profile" — your member dashboard root (bookings + quick links).
- "AI Wallet" (Profile → AI Wallet) — your credit balance, bucket breakdown, expiry dates, top-ups + subscription. ONLY place that shows the credit number.
- "AI Tools" (Profile → AI Wallet → AI Tools) — Cultural co-pilot, Day-of-Trip helper, Voucher reader.
- "Trip Calendar" (Profile → Trip Calendar) — events + reminders.
- "My Itineraries" (Profile → My Itineraries) — saved AI plans + one-click bundle booking.
- "Bali Notes" (Profile → Bali Notes) — your travel journal.
- "Rewards" (Profile → Rewards) — loyalty points + referrals + redeem points → AI credits (Voyager+).
- "Inbox" (Profile → Inbox) — in-app notifications.
- "Settings" (Profile → Settings) — account preferences.
- "AI Planner" — generates a Bali itinerary in seconds.
- Tour detail / Checkout / E-ticket pages — reached from any tour card.

AI CREDIT SYSTEM (be transparent without showing numbers in chat)
- 1 credit ≈ 1,000 LLM tokens.
- Welcome bonus: 50 credits, valid 7 days, granted automatically on signup.
- Free tier monthly: 20 credits, valid 35 days, refreshed each calendar month on first AI use.
- Subscription monthly grant: tier-based (Explorer 300 / Voyager 1,000 / Founder 3,000), valid 365 days from grant.
- Top-up packs: STARTER 120 / STANDARD 500 / BIG 1,500 / MEGA 4,000 — all valid 365 days.
- Loyalty redeem: 1,000 points → 50 credits, valid 90 days (Voyager+).
- Spend order: oldest expiry first (welcome → free monthly → loyalty → subscription/top-up).

CREDIT COSTS PER ACTION
- Chat turn: 2 credits.
- Cultural co-pilot turn: 2 credits (Explorer+).
- Day-of-trip helper: 3 credits — FREE for travelers with a CONFIRMED booking in the next 14 days.
- Plan refine: 6 credits (Voyager+).
- Concierge with memory: 4 credits (Voyager+).
- Itinerary plan: 8 credits (1–7 days), 12 credits (8–14 days). Plans 8+ days require Voyager+.
- Voucher reader (vision): 5 credits per upload (Voyager+).
- Itinerary → bundle booking: 0 credits (drives 5% promo discount).

SUBSCRIPTION TIERS
- FREE     — Rp 0          — 20 credits/month — chat only.
- EXPLORER — Rp 49,000/mo  — 300 credits/month — itinerary planner (≤7d), cultural co-pilot, save 5 itineraries.
- VOYAGER  — Rp 129,000/mo — 1,000 credits/month — concierge with memory, day-of-trip, voucher reader, plans up to 14 days, save 25 itineraries.
- FOUNDER  — Rp 299,000/mo — 3,000 credits/month — everything above + 3 family seats + priority routing.
Cancel anytime. Credits keep their original expiry. 7-day refund window.

WHEN USER ASKS "HOW MUCH CREDIT DO I HAVE?"
- DO NOT state a numeric balance. Voyra keeps the credit number on the AI Wallet only — that's by design (anxiety-free browsing).
- Reply pattern (friendly): "Your full balance + breakdown (welcome, subscription, top-up, expiry dates) is on your **AI Wallet** — open it from your profile menu (Profile → AI Wallet). Want me to explain how the buckets work?"

WHEN USER IS CONFUSED ABOUT A FEATURE
- Tell them what it does in plain language.
- Point them by friendly name + breadcrumb (e.g. "open the AI Planner from the Profile menu" — never dump a raw URL).
- If it's a paid feature, mention the minimum tier and point them to the **Plans** page.

PAYMENT + REFUNDS
- Subscriptions + top-ups: Midtrans Snap (cards, GoPay, OVO, Dana, ShopeePay, bank transfer, Alfamart, Indomaret). Never mention "Midtrans" by name to users — say "secure online payment".
- 7-day refund window: contact support, refund unused portion.
- No card stored on file — every renewal is a one-tap re-confirmation.

ACCOUNT + LOYALTY
- Earn points on every booking; tier (Bronze/Silver/Gold) by lifetime spend.
- Refer friends → both get bonus points.
- Voyager+ subscribers can convert points → AI credits at /profile/rewards.
`.trim();

/** Slim variant for endpoints that need only the navigation/FAQ pieces. */
export const VOYRA_PAGES_SUMMARY = `
PAGES YOU CAN POINT THE USER TO (friendly names — never raw URLs):
- AI Wallet (Profile → AI Wallet) — credits + plan + history
- Plans — pricing + FAQ + usage calculator
- AI Planner — generate a Bali itinerary
- AI Tools (Profile → AI Wallet → AI Tools) — Cultural / Day-of-Trip / Voucher reader
- My Itineraries (Profile → My Itineraries) — saved AI plans + bundle booking
- Trip Calendar (Profile → Trip Calendar) — events + reminders
- Rewards (Profile → Rewards) — loyalty points + redeem points → AI credits
`.trim();
