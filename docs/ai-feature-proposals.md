# AI Feature Proposals — Voyra Tour Bali

> Planning document only. No implementation. Prepared after reviewing `agent/docs` (prd, domain, architecture, tech-debt), the Prisma schema, and the existing `/api/ai/*` surface.
> Author intent: a few high-value, non-duplicate AI features that solve real traveler problems and lean on infrastructure that already exists.

---

## 0. What already exists (so we don't rebuild it)

Confirmed live AI + engagement surfaces — **none of the proposals below duplicate these**:

| Existing | Where | Note |
|---|---|---|
| AI Trip Planner + per-day Refine | `/ai/plan`, `ItineraryRefinePanel` | Generates + edits saved itineraries |
| AI Concierge (chat, per-user memory) | `AIChatWidget`, `/api/ai/concierge` | **Global**, advisory only, does not book |
| Cultural Co-pilot (calendar-grounded) | `/ai/tools`, `/api/ai/cultural` | Grounded in `BaliEvent` |
| Day-of-Trip helper (booking-aware) | `/ai/tools`, `/api/ai/day-of-trip` | Free for confirmed travelers |
| Voucher Reader (vision) | `/ai/tools`, `/api/ai/voucher-read` | Claude vision → Trips/Calendar |
| Map Explorer | `/explore` | Region discovery → guides + planner |
| Credit wallet / subscription / family seats | `/ai/wallet`, `aiCreditService` | Reserve/settle billing pattern |
| Trip Calendar + push notifications | `/trips/calendar`, notification subsystem | Reminders, broadcasts, web-push |

**Hard boundaries** (from `prd.md` / `tech-debt.md` — do not fight these):
- Reviews subsystem was **intentionally removed** (migration `drop_review_subsystem`). Do **not** propose a user-reviews feature.
- Multi-currency beyond IDR/USD, group split-pay, refund automation, native app — explicit non-goals.
- Viator products are **not** stored in the DB (live API only) — anything "search/index Viator" must call the live API, not assume local rows.
- `Destination` has **no lat/lng** — features needing real coordinates require a schema migration (call it out explicitly).
- Primary LLM is Groq `llama-3.3-70b`; Claude used only for vision. New text AI should use the existing Groq + credit-reserve pattern.

---

## 1. Proposal A — Natural-Language Search ("Ask Voyra to find it")

**Priority: HIGH · Complexity: Medium**

### Problem it solves
`prd.md` and the code confirm `/search` only matches destination **titles/slugs**. Travelers don't think in slugs — they search in intent: *"waterfall day trip good for kids near Ubud under 500k"*, *"rainy-day activities in Seminyak"*. Today that query returns almost nothing, so users bounce or under-discover the catalog (both Voyra-curated **and** Viator supply).

### Target users
All travelers in the discovery phase — especially first-time visitors who don't know Bali place names.

### How it works
1. User types a natural-language query into the existing search entry (`SearchModal` / `/search`).
2. An AI intent-parser converts free text into a **structured filter object**: `{ region, themes[], budgetIDR, paxProfile (kids/seniors), indoor/outdoor, duration }`.
3. Those filters run against (a) Voyra destinations/packages via Prisma and (b) Viator via the existing `searchViatorProducts` service.
4. Results render in the current search UI, with a one-line "why these" explanation.

### How AI is involved (meaningfully, not decoration)
AI does the **translation from human intent → machine filters** — the part keyword search fundamentally cannot do. The retrieval and ranking stay deterministic (DB + Viator), so results are grounded and cheap. AI is the parser, not the answer generator.

### Why it's valuable
- Directly fixes a documented weakness with outsized UX + revenue impact (search → booking is top of funnel).
- Surfaces the Viator long-tail that title-match search never reaches.
- Low ongoing cost: one small LLM call per query (parse only), cacheable by normalized query string.

### Integration & non-duplication
- Enhances existing `/search` — does **not** add a new page or duplicate Concierge (Concierge is conversational/advisory; this is retrieval).
- Reuses `searchViatorProducts` and the credit-reserve pattern (or a cheap flat cost like the existing `search: 1` credit entry in `aiCosts.ts`).

---

## 2. Proposal B — "Ask about this tour" (product-scoped AI Q&A)

**Priority: HIGH · Complexity: Medium**

### Problem it solves
On a product/detail page, travelers have blocking pre-purchase questions — *"Is this ok for a 3-year-old? How much walking? Hotel pickup in Canggu? Wheelchair accessible?"* With reviews removed and no Q&A, they leave to Google or abandon. This is a **conversion leak** right at the buy step.

### Target users
High-intent travelers on `/detail/[slug]` and Viator product pages — the ones closest to paying.

### How it works
- An inline "Ask about this tour" box on the product page.
- AI answers **grounded strictly in that product's own data** (title, description, inclusions/exclusions, duration, meeting point, pax bands, cancellation policy) — Voyra destination fields or the Viator product payload already fetched for the page.
- If the data can't answer, it says so and suggests contacting support / checking availability — never invents specifics (prices, pickup) it doesn't have.

### How AI is involved
Retrieval-grounded Q&A over a single product's structured fields — turns dense inclusion/exclusion text into a direct answer. AI is constrained to provided context (low hallucination risk, low cost).

### Why it's valuable
- Removes purchase friction exactly where revenue is decided.
- Recovers some of the trust signal lost when reviews were dropped, without rebuilding reviews.
- Scoped context = cheap, fast, safe answers.

### Integration & non-duplication
- Distinct from global Concierge: **product-scoped and grounded**, not open-domain chat. Different placement, different prompt, different value (conversion vs. general help).
- Reuses product data already loaded server-side; new endpoint `/api/ai/product-qa` following the reserve/settle pattern.

---

## 3. Proposal C — AI Pre-Trip Briefing & Smart Trip Timeline

**Priority: HIGH · Complexity: Medium**

### Problem it solves
Once a booking is `CONFIRMED`, the traveler is on their own until the day of the tour. There's no synthesis of *"what your trip actually looks like"*: overlapping ceremonies (e.g. Nyepi = airport closed!), weather outlook, what to pack, meeting-point logistics, and day-by-day prep. The data to answer all of this **already lives in the system** — it's just never assembled.

### Target users
Every user with an upcoming confirmed booking (`Booking.travelDate` in the near future).

### How it works
- A **Trip Briefing** view (on `/trips`, per upcoming booking) and an optional push/email digest a few days before travel via the existing notification subsystem.
- Assembles: the confirmed booking(s), `BaliEvent` rows overlapping the travel window (cultural impact/closures), a packing/prep checklist, and meeting-point/logistics notes.
- Reuses Day-of-Trip logic for on-the-ground pivots once travel starts.

### How AI is involved
AI **synthesizes structured trip data into a personalized, readable briefing** and a prioritized checklist — the "connect-the-dots" reasoning across booking + calendar + cultural events that a template can't do well. Grounded in real rows (BaliEvent, Booking), so it flags concrete risks like Nyepi shutdowns.

### Why it's valuable
- Converts a dead post-purchase gap into retention + trust ("Voyra looked after me").
- Uniquely leverages Voyra's own data moat (curated bookings + Bali cultural calendar) — hard for a generic AI chatbot to replicate.
- Reuses notifications/push/email already built — mostly assembly, not new plumbing.

### Integration & non-duplication
- Not a duplicate of Day-of-Trip (that's reactive, in-trip, question-driven). This is **proactive, pre-trip, synthesized**.
- Reuses `BaliEvent`, `Booking`, notification broadcast/push, and Cultural grounding.
- No schema change required for a v1 (weather can be a simple external call or omitted initially).

---

## 4. Proposal D — Itinerary Budget Optimizer (IDR-native)

**Priority: Medium · Complexity: Medium**

### Problem it solves
The planner produces a great day-by-day itinerary but no **cost picture in IDR** (Voyra's core currency). Travelers plan to a budget; "fit my trip to 5 million IDR" is a real need the product can't answer today. (The existing cost preview is about AI *credits*, not trip money.)

### Target users
Budget-conscious planners using `/ai/plan` and saved itineraries in `/trips`.

### How it works
- On a saved itinerary, show an estimated cost breakdown in IDR (activities from Viator/Voyra prices + rough transport/meal allowances).
- "Fit to budget" action: user enters a target; AI proposes swaps/removals (reusing the existing **Refine** mechanism) to hit it.

### How AI is involved
AI reasons about **trade-offs** — which items to swap for cheaper equivalents while preserving trip quality/theme. Pricing math stays deterministic; AI drives the swap strategy. This is a natural extension of the Refine endpoint already in place.

### Why it's valuable
- Speaks the customer's actual currency and constraint.
- Extends existing planner/refine investment rather than adding a silo.

### Integration & non-duplication
- Builds on `plan-refine` + saved-itinerary items; reuses `formatPrice`/exchange-rate proxy for IDR.
- Not a standalone "budget calculator" page — it lives where itineraries already live.

---

## 5. Proposal E — On-Demand Guide/Content Translation (international travelers)

**Priority: Medium · Complexity: Medium-High**

### Problem it solves
`prd.md` notes a single English locale, but the audience is international. Non-English travelers can't consume the long-form guides that drive trust and SEO.

### Target users
Non-English-speaking international visitors reading `/guides` and destination content.

### How it works
- A language toggle on guide/content pages; AI translates the rendered content on demand, cached per (content, language) to control cost.

### How AI is involved
LLM translation tuned for travel tone and Balinese/Indonesian proper nouns (keeps place names intact) — better than raw machine translation for this domain.

### Why it's valuable
- Widens the addressable market; compounding SEO if cached translations are indexable.

### Integration & non-duplication
- No existing translation feature. Caution: this is closest to a documented non-goal (i18n scope) and has the most infra cost (caching, cache invalidation on edits) — hence Medium priority and last.

---

## 6. Recommendation summary

| # | Feature | Problem | AI role | Complexity | Priority |
|---|---------|---------|---------|-----------|----------|
| A | Natural-Language Search | Weak title/slug search | Intent → filters | Medium | **High** |
| B | "Ask about this tour" Q&A | Pre-purchase friction | Grounded product Q&A | Medium | **High** |
| C | Pre-Trip Briefing & Timeline | Dead post-purchase gap | Synthesize trip data | Medium | **High** |
| D | Itinerary Budget Optimizer | No IDR cost picture | Trade-off reasoning | Medium | Medium |
| E | Guide Translation | English-only content | Domain translation | Med-High | Medium |

### Suggested sequencing
1. **B first** — smallest blast radius, directly revenue-linked, grounded/low-risk. Good proof point.
2. **A next** — fixes a known weakness, top-of-funnel impact, reuses Viator search.
3. **C** — highest retention/differentiation payoff; more assembly across subsystems, so do it once A/B validate the AI-cost model.
4. **D / E** as follow-ups.

### Cross-cutting notes
- All new text AI should reuse the **reserve → settle** credit pattern (`aiCreditService`) and add a cost entry in `lib/config/aiCosts.ts`; surface cost transparently like existing tools.
- Keep retrieval deterministic (DB + Viator) and use AI for **parsing / synthesis / reasoning** — this keeps answers grounded, cheap, and on-brand.
- None of A–D require a schema migration for a v1. E requires a translation cache table. Anything needing map coordinates (not proposed here) would need `lat/lng` on `Destination`.
