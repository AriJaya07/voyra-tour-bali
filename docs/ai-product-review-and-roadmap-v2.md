# BaliTravelNow — AI-First Product Review & Roadmap (v2)

> **Planning document only. No implementation.**
> Prepared after reading the full `agent/` documentation set (prd, architecture, domain, tech-debt, environment, test-user specs), the Prisma schema, the entire `/api/ai/*` surface + credit/subscription subsystem, and a live review of https://balitravelnow.com.
> Author lens: Senior PM + Senior UX + AI Solutions Architect.
> Scope: ambitious, production-ready ideas that do **not** duplicate what already ships. Where a similar feature exists, this document proposes how to *significantly extend* it rather than rebuild it.

---

## Part 1 — What already exists (so nothing here duplicates it)

BaliTravelNow is already a mature AI-first platform, not a greenfield. Confirmed live AI surface:

| Area | Shipped today |
|---|---|
| **Discovery** | NL search parser (`/api/ai/search-parse`, text → structured filters), Map Explorer (`/explore`), Trending activity |
| **Planning** | AI Trip Planner (`/api/ai/plan`, Viator-grounded, region+interest locked), per-day Refine (`/api/ai/plan-refine`), Itinerary→bundle booking with 5% promo |
| **Conversation** | Chat widget (Viator RAG, guest quota), Concierge with persistent per-user memory (`AiChatMemory`, `__MEMO__` markers) |
| **Culture** | Cultural Co-pilot grounded in `BaliEvent` calendar |
| **Pre/During trip** | Pre-Trip Briefing (booking + event synthesis), Day-of-Trip helper (free for confirmed travelers) |
| **Conversion** | Product Q&A grounded in a single product's fields |
| **Vision** | Voucher Reader (Claude vision → ImportedTrip/CalendarEvent) |
| **i18n** | On-demand content Translation (9 languages) |
| **Monetization** | Full credit wallet, reserve/settle billing, 4 subscription tiers, top-up packs, loyalty→credit redeem, referral credits, family seats, funnel analytics |
| **Engagement** | Trip Calendar (RRULE), Notification inbox (in-app/push/email), Notes, Loyalty, Referral, weather/volcano/Nyepi alert crons |

**Provider reality:** All text AI = Groq `llama-3.3-70b-versatile`. Vision only = Anthropic Claude (`claude-haiku-4-5`). Kept by explicit user direction — proposals respect this.

**Hard constraints (do not fight these):**
- User-reviews subsystem was **intentionally removed** — do not propose reviews.
- `Destination`/`Location` have **no lat/lng** — anything needing real coordinates needs a migration + geocoding, called out explicitly.
- **No embeddings / vector search anywhere** — all retrieval is keyword/region matching today.
- **No tool-use / function-calling / agentic booking** — every AI feature is advisory; booking is redirect-only.
- **No voice** anywhere.
- Viator products are **not** stored in DB (live API only).
- Explicit non-goals: multi-brand, live-agent chat, split-pay, refund automation, native app.

---

## Part 2 — Current-state assessment

**Strengths.** The credit/billing spine is genuinely excellent — reserve/settle, per-source grant buckets, cost transparency pills, kill switch. Grounding discipline is strong (region/interest locks, no hallucinated product codes). The data moat is real: curated destinations + Bali cultural calendar + confirmed bookings + user notes.

**The three structural gaps that cap the ceiling:**

1. **AI can advise but cannot act.** Every feature ends at "go to balitravelnow.com to book." The whole funnel from intent → itinerary → booking is stitched by the *user*, not the AI. This is the single biggest missed opportunity.
2. **No semantic layer.** The content moat (guides, public notes, events, destination copy) is invisible to the AI except through brittle keyword/region matching. There is no way to ask "temples good for a rainy afternoon near Ubud" and have it reason over the actual corpus with citations.
3. **Personalization is captured but barely used.** `UserPreferences`, wishlist, recently-viewed, loyalty tier, and concierge memory exist — but the *catalog and homepage are identical for everyone*. The profile only feeds the planner/chat prompt, never the ranking of what a user sees.

The roadmap below is sequenced to fix these three first (they are force-multipliers), then layer differentiated experiences on top.

---

## Part 3 — Foundational infrastructure (build these first; features depend on them)

### F1 — Semantic/RAG layer (pgvector embeddings)
**Why first:** unlocks grounded citations for Concierge, semantic catalog search, "similar tours," and recommendation candidate generation.
- **Schema:** add `pgvector` extension; a single `ContentEmbedding` table (`sourceType`, `sourceId`, `chunk`, `embedding vector(1024)`, `metadataJson`). Sources: `Guide`, `BaliNote` (public+approved), `BaliEvent`, `Content`, `Destination`. Viator stays live-API — embed only the *result snippets* at query time (ephemeral), never persist Viator rows (respects the no-DB-storage constraint).
- **Embedding model:** Groq does not host embeddings today → use a cheap dedicated embeddings API. Recommended: **Voyage AI `voyage-3-lite`** or **OpenAI `text-embedding-3-small`** (1536-d) or self-host **`bge-m3`** (multilingual, matches the 9-language translation ambition). Pick one; multilingual matters here.
- **Indexing:** a cron (`/api/cron/embeddings-sync`) re-embeds changed rows (dirty-flag by `updatedAt`). Reuse the existing cron+CRON_SECRET pattern.
- **Retrieval:** `lib/services/ragService.ts` → `semanticSearch(query, filters, k)` returns chunks + source refs for citation.

### F2 — Agentic tool-use runtime
**Why first:** turns advisory chat into an assistant that *does things*. Groq `llama-3.3-70b-versatile` supports OpenAI-style tool calling.
- **New:** `lib/services/aiToolRuntime.ts` — a bounded ReAct loop (max N tool hops) exposing **read-only, safe tools first**: `searchTours`, `checkAvailability`, `getPrice(IDR)`, `semanticSearch` (F1), `getMyBookings`, `getMyItinerary`, `createBookingDraft`. **Never** a tool that charges money without an explicit human confirm step.
- **Guardrails:** every tool call is logged to `AiUsage`; write-tools require a signed, user-confirmed action token; reuse the existing idempotency-key discipline.
- This runtime is the substrate for Features 1, 4, and 5 below.

### F3 — Personalization spine ("Traveler DNA")
**Why first:** one place that fuses `UserPreferences` + wishlist + recently-viewed + booking history + concierge memory into a reusable profile vector + tags, consumed by recommendations, planner defaults, briefings, and notifications.
- **New:** `lib/services/travelerProfileService.ts` → `getTravelerProfile(userId)` returning `{ styleVector, tags[], budgetBand, regionAffinity[], paxProfile }`, cached (`Cache-Control: private`).
- No new heavy schema — derived from existing rows + optional denormalized `User.profileVector`.

---

## Part 4 — Feature proposals

Each follows the requested 10-point structure.

---

### Feature 1 — **Voyra Booking Agent** (advisory → transactional AI)
**Priority: HIGH · Complexity: High · Depends on: F2 (+F1)**

1. **Problem it solves.** Today the AI plans a perfect trip and then abandons the user at "go book it yourself." The intent→itinerary→checkout journey is manual and leaky. High-intent users drop between the plan and the payment.
2. **Why users value it.** "Book my whole 5-day plan" in one conversation — the agent checks live availability, prices everything in IDR, assembles a draft cart, and hands off a single confirm-and-pay step. This is the headline differentiator no generic chatbot can match, because it's wired to real Viator availability + Midtrans.
3. **How AI integrates.** The F2 tool-runtime drives a bounded agent: `searchTours → checkAvailability → getPrice → createBookingDraft`. The LLM orchestrates; **all money math and the booking write are deterministic server code**. A mandatory human-in-the-loop confirmation screen precedes any Snap token — the AI never auto-charges.
4. **User flow.** In Concierge: *"Book the Nusa Penida day and the Ubud rice-terrace morning for 2 adults next Tuesday."* → agent replies with a priced draft (availability confirmed, IDR total, cancellation terms) → user taps **Review & Pay** → existing checkout/Snap flow → confirmation email + ticket (all existing plumbing).
5. **UI/UX.** Rich "draft cart" card inside the chat stream (line items, IDR totals, live-availability badge, cancellation policy). A persistent "Trip cart" pill. Clear "AI prepared this — you confirm & pay" framing for trust. Never hide the price.
6. **Technical architecture.** `aiToolRuntime` + new `/api/ai/agent` endpoint; write-tools produce a `BookingDraft` (reuse Zustand `useBookingStore` shape) not a charge; confirm step routes through the *existing* `/api/bookings/local` + `/checkout`. Idempotency keys + reserve/settle for the AI turn cost.
7. **Recommended models/services.** Groq `llama-3.3-70b-versatile` with tool calling (already the provider). No new provider needed. Viator live API + Midtrans (existing).
8. **Priority.** HIGH — directly converts the platform's biggest funnel leak.
9. **Complexity.** High — tool runtime, draft-cart UX, careful money/consent guardrails.
10. **Why it strengthens the product.** Moves BaliTravelNow from "AI that talks about Bali" to "AI that books Bali." That's the category-defining leap and the clearest moat vs. ChatGPT-with-a-browser.

---

### Feature 2 — **Semantic Concierge with citations + semantic catalog search**
**Priority: HIGH · Complexity: Medium · Depends on: F1**

1. **Problem.** Concierge/chat can only reach content through keyword/region matching, so it misses the guides, public notes, and events that are the platform's trust assets — and it can't *cite* sources, so answers feel like generic LLM output.
2. **Why users value it.** Ask *"quiet temples near Ubud good on a rainy afternoon"* and get an answer grounded in real Voyra guides + community notes, **with clickable citations** to those pages. Trustworthy, on-brand, and it deepens time-on-site.
3. **How AI integrates.** RAG: F1 `semanticSearch` retrieves top-k chunks from the owned corpus; the LLM answers *only* from retrieved context and emits citation markers the UI renders as source chips. Retrieval deterministic, generation grounded.
4. **User flow.** Same Concierge/chat entry; answers now carry "Sources: [Ubud Guide], [Nyepi 2026], [note by traveler]" chips → click opens the page. Also powers a new **semantic mode** on `/search` and `/explore` ("more like this").
5. **UI/UX.** Source-chip row under each grounded answer; "based on Voyra guides" badge; a semantic "similar experiences" rail on detail pages.
6. **Technical architecture.** `ragService.semanticSearch` (F1) injected into concierge/chat system prompt as a retrieved-context block; citation post-processor. Recompute embeddings via cron on content edit. Partly extends the existing `aiKnowledgeBase` injection.
7. **Recommended models/services.** Groq for generation (existing) + the F1 embedding model. Reranking optional (Voyage `rerank-2` / `bge-reranker`) for precision.
8. **Priority.** HIGH — trust + discovery + partially recovers the credibility lost when reviews were removed, without rebuilding reviews.
9. **Complexity.** Medium (mostly F1 wiring + citation UX).
10. **Why it strengthens the product.** Turns the dormant content moat into a live, cited answer engine — something a generic chatbot with web access cannot replicate on *Voyra's* curated corpus.

---

### Feature 3 — **"For You" personalized discovery feed**
**Priority: HIGH · Complexity: Medium · Depends on: F3 (+F1)**

1. **Problem.** The homepage and catalog are identical for every visitor. Rich signals (`UserPreferences`, wishlist, recently-viewed, loyalty tier, booking history) never influence what a user *sees* — they only feed the planner prompt.
2. **Why users value it.** A returning user lands on a homepage that already knows they travel with kids, love waterfalls, and prefer Ubud — surfacing relevant tours + guides + upcoming ceremonies immediately, cutting search effort.
3. **How AI integrates.** Hybrid: F3 Traveler DNA (rules + tags) for candidate generation; F1 embeddings for "similar to what you saved/viewed"; a lightweight LLM pass only for the one-line *"why we picked this for you"* explanation (cheap, cacheable). Ranking stays deterministic.
4. **User flow.** Authenticated homepage gains a "For You" rail above the fold; `/explore` gains a personalized default sort; empty-state falls back to Trending for new users.
5. **UI/UX.** Reuse existing card components; add a subtle "For you" chip + one-line rationale; a "not interested / more like this" control that writes back to Traveler DNA (closing the loop).
6. **Technical architecture.** New `/api/me/for-you` (aggregated, `Cache-Control: private, max-age=60`), `recommendationService.ts` combining F3 tags + F1 similarity over Destinations/Guides + live Viator top-ups. Feedback events update the profile.
7. **Recommended models/services.** Embedding model (F1) + Groq only for short rationale strings. No new infra.
8. **Priority.** HIGH — compounding retention + conversion on every return visit.
9. **Complexity.** Medium.
10. **Why it strengthens the product.** Converts already-captured personalization data into felt value on every session — the difference between a catalog and a *personal* travel companion.

---

### Feature 4 — **Voice Concierge / hands-free in-trip companion**
**Priority: HIGH · Complexity: Medium-High · Depends on: F2 for actions**

1. **Problem.** In-trip, travelers have their hands full (driving, walking, on a scooter). Typing to the Day-of-Trip helper is impractical exactly when it's most useful.
2. **Why users value it.** Talk to Voyra like a local guide: *"What's near me for lunch, and is Tegallalang busy right now?"* Hands-free, fast, natural — especially for the on-the-ground moments generic apps handle poorly.
3. **How AI integrates.** **Groq already hosts Whisper** (`whisper-large-v3`) for STT — a natural, same-provider add. Round-trips through the existing Concierge/Day-of-Trip logic (and F2 tools for actions), then TTS for the reply.
4. **User flow.** Mic button in the chat widget → speak → transcript + spoken answer. Works in the existing day-of-trip free window for confirmed travelers.
5. **UI/UX.** Push-to-talk mic, live waveform, editable transcript before send, playback toggle; graceful fallback to text where mic denied; reduced-motion aware.
6. **Technical architecture.** New `/api/ai/voice/transcribe` (Groq Whisper) → existing concierge/day-of-trip route → TTS. Meter STT/TTS as new `aiCosts.ts` entries via reserve/settle. Guest-quota reuse.
7. **Recommended models/services.** STT: **Groq `whisper-large-v3`** (no new vendor). TTS: **ElevenLabs** (best quality) or **OpenAI `tts-1`** or on-device Web Speech API (zero-cost fallback). Recommend Web Speech for v1, ElevenLabs for premium.
8. **Priority.** HIGH for in-trip differentiation (Medium if resourcing is tight).
9. **Complexity.** Medium-High (audio UX + streaming).
10. **Why it strengthens the product.** Owns the in-destination moment — the highest-emotion, lowest-competition part of the journey — and leans on infrastructure (Groq) already in place.

---

### Feature 5 — **"Snap Bali" — camera vision companion**
**Priority: Medium · Complexity: Medium · Depends on: existing Claude vision (+F1)**

1. **Problem.** In-trip, travelers constantly wonder *"what is this temple / dish / offering, and can I book something like it?"* The vision capability exists but is scoped only to reading vouchers.
2. **Why users value it.** Point the camera at a landmark, dish, or ceremony → identification + cultural context + bookable next action. A magical, shareable, uniquely-Bali feature.
3. **How AI integrates.** Extend the existing Claude vision endpoint beyond OCR: landmark/dish/offering recognition → ground the explanation in `BaliEvent`/guides via F1 → suggest nearby bookable Voyra/Viator experiences. Also menu/sign translation (reuses translate).
4. **User flow.** "Scan" tab in AI tools / camera icon in widget → snap → identification card (what it is, etiquette/cultural note, "book similar" CTA, "translate this menu").
5. **UI/UX.** Full-screen camera sheet, result card with cultural note + CTA + share button; explicit "AI can be wrong — verify etiquette locally" disclaimer for ceremonies.
6. **Technical architecture.** Generalize `/api/ai/voucher-read` into `/api/ai/vision` with an `intent` (`voucher|identify|menu`) param; reuse `ENABLE_AI_VISION` gate + credit cost; RAG grounding via F1.
7. **Recommended models/services.** Anthropic Claude vision (existing, `claude-haiku-4-5`, upgrade to a stronger vision model for landmark ID if needed). No new vendor.
8. **Priority.** Medium — high delight, but in-trip usage is narrower than planning.
9. **Complexity.** Medium.
10. **Why it strengthens the product.** Extends an existing capability into a signature, word-of-mouth feature that ties culture → discovery → booking.

---

### Feature 6 — **Proactive Trip Guardian** (autonomous monitoring + re-plan)
**Priority: Medium-High · Complexity: Medium · Depends on: existing crons + Refine + notifications (+F2)**

1. **Problem.** Weather/volcano/Nyepi crons already fire *templated* alerts, but they stop at "heads up." They don't reason about *this* traveler's plan or offer a fix. Post-booking, disruptions are the user's problem to solve.
2. **Why users value it.** *"Heavy rain forecast on your Nusa Penida day — want me to swap it with your indoor Ubud plan and rebook?"* Proactive, contextual, and actionable — the platform actively protecting the trip.
3. **How AI integrates.** An agent job joins confirmed bookings + itinerary + weather/volcano/`BaliEvent` signals, reasons about impact, and drafts a concrete swap using the existing Refine mechanism; delivered via the notification inbox with a one-tap accept (F2 for the rebook action).
4. **User flow.** Push/inbox notification with a proposed fix → tap → see the swapped plan → confirm (rebook via Feature 1 draft-cart).
5. **UI/UX.** Actionable notification cards (not just text); "Voyra is watching your trip" status on `/trips`; per-signal opt-out (reuse `NotificationPref`).
6. **Technical architecture.** New `/api/cron/trip-guardian` layering LLM reasoning over the existing alert crons; outputs `NotificationBroadcast`/`notifyUser` with action payloads; reuses `plan-refine`.
7. **Recommended models/services.** Groq (existing) + a weather API (Open-Meteo, free) — note weather is currently minimal.
8. **Priority.** Medium-High — strong retention/trust, mostly assembly over existing subsystems.
9. **Complexity.** Medium.
10. **Why it strengthens the product.** Turns dead post-purchase alert plumbing into an intelligent concierge that *acts* — a data-moat feature (needs the booking + cultural calendar together).

---

### Feature 7 — **Collaborative group planning with AI consensus**
**Priority: Medium · Complexity: Medium-High · Depends on: existing SavedItinerary + shareSlug + Refine**

1. **Problem.** Group trips are planned by one person guessing at everyone's preferences. Split-pay is a non-goal, but *collaborative planning* is not — and it's a huge Bali use case (friends, families).
2. **Why users value it.** Everyone drops preferences into a shared trip; AI reconciles conflicting wishes (adventure vs. wellness, budget vs. splurge) into one balanced itinerary and explains the trade-offs.
3. **How AI integrates.** AI aggregates multiple `UserPreferences`/inputs into a consensus objective and generates/refines a shared `SavedItinerary`, annotating *why* (e.g., "Day 3 is a spa day for the wellness folks; Day 2 keeps the adventurers happy").
4. **User flow.** Owner creates a shared trip → invites via existing share-slug pattern → members add preferences/veto items → AI produces a consensus plan → group votes → finalize (→ Feature 1 to book).
5. **UI/UX.** Shared itinerary view with per-member preference chips, voting, and AI "consensus rationale" callouts.
6. **Technical architecture.** Extend `SavedItinerary` with lightweight collaborator rows; new `/api/ai/plan-consensus`; reuse Refine + share-slug + notification invites.
7. **Recommended models/services.** Groq (existing).
8. **Priority.** Medium — differentiated but narrower than solo planning.
9. **Complexity.** Medium-High (collaboration state + invites).
10. **Why it strengthens the product.** Captures the group-trip planner — a high-value, sticky, viral (multi-user invite) surface competitors rarely do well.

---

### Feature 8 — **AI Content Studio for admins** (ops automation)
**Priority: Medium · Complexity: Medium · Depends on: existing translate + structured output (+F1)**

1. **Problem.** The content moat (destinations, guides, SEO copy) is hand-authored — slow to scale, and English-only despite an international audience.
2. **Why it's valuable (to the business).** Admins draft destination/guide content, meta descriptions, and multilingual variants in minutes; more indexable content → compounding SEO → cheaper acquisition.
3. **How AI integrates.** LLM drafts structured `Destination`/`Guide` content + SEO meta from Viator data + a brief; auto-translates via the existing translate endpoint; human editor approves before publish (never auto-publish).
4. **User flow.** In `/dashboard`, "Draft with AI" on the content form → review/edit → publish → optional "generate 9 language variants."
5. **UI/UX.** Inline draft-and-diff in the existing `DestinationForm`; translation matrix with per-language publish toggles.
6. **Technical architecture.** New admin-gated `/api/admin/ai/content-draft`; structured JSON output; reuse translate + cache; embed on publish (F1).
7. **Recommended models/services.** Groq for drafting; embedding model on publish.
8. **Priority.** Medium — internal leverage, not user-facing, but high ROI on growth.
9. **Complexity.** Medium.
10. **Why it strengthens the product.** Scales the content + i18n moat that powers Features 2/3 and organic acquisition — force-multiplier on everything above.

---

## Part 5 — Improvements to *existing* AI features (not duplicates)

- **Concierge → grounded + agentic.** Fold F1 citations (Feature 2) and F2 tools (Feature 1) into the *existing* concierge rather than a new chat — one assistant that remembers, cites, and acts.
- **Planner → IDR budget optimizer.** Add a real trip-cost (IDR) breakdown + "fit to budget" swap action (extends Refine). Currently only AI *credit* cost is shown, never trip money — a documented gap in the earlier proposals doc.
- **NL search → semantic + personalized.** Layer F1 semantic retrieval and F3 ranking onto `search-parse` so parsed filters are *ranked* for the specific user.
- **Voucher Reader → generalized vision** (Feature 5).
- **Translation → auto-detect + persistent per-user language + indexable cached variants** (SEO upside), instead of manual per-block toggle.

---

## Part 6 — Prioritized roadmap & sequencing

**Phase 0 — Foundations (unblock everything):**
1. **F1 semantic/RAG layer** (pgvector + embeddings + sync cron)
2. **F3 Traveler DNA service**
3. **F2 tool-use runtime** (read-only tools first)

**Phase 1 — Highest leverage, user-facing:**
4. **Feature 2** Semantic Concierge + citations (rides F1; fast win, trust)
5. **Feature 3** "For You" feed (rides F1+F3; retention)
6. **Feature 1** Booking Agent (rides F2; the category leap)

**Phase 2 — Differentiated experiences:**
7. **Feature 6** Trip Guardian (retention, mostly assembly)
8. **Feature 4** Voice Concierge (in-trip moat; Groq Whisper)

**Phase 3 — Delight + scale:**
9. **Feature 5** Snap Bali vision
10. **Feature 8** Admin Content Studio (SEO/i18n scale)
11. **Feature 7** Collaborative group planning

**Recommended first build:** Feature 2 (smallest blast radius on F1, immediate trust/discovery payoff) as the proof point, in parallel with F2 runtime so Feature 1 (the differentiator) lands in Phase 1.

---

## Part 7 — Cross-cutting notes, risks, constraints

- **Billing:** every new AI action reuses reserve→settle + a new `aiCosts.ts` entry + a `CostPill`. Voice/vision/embeddings need cost entries tuned to their provider prices.
- **New external dependencies to greenlight:** an embeddings provider (F1), optionally a TTS provider (Feature 4), a weather API (Feature 6). Each is a small, isolated add.
- **Schema migrations required:** pgvector + `ContentEmbedding` (F1); light collaborator rows on `SavedItinerary` (Feature 7); optional `User.profileVector` (F3). **No lat/lng needed** for any Phase 0–2 feature — geo stays deferred until a map-distance feature is explicitly wanted.
- **Trust guardrails (non-negotiable):** the Booking Agent never charges without an explicit human confirm; vision/culture features carry "verify locally" disclaimers; grounded features cite sources; keep the "AI can be wrong" framing that already exists.
- **Respect the removed-reviews decision:** Feature 2's citations to *public, approved* `BaliNote` restore social proof **without** reintroducing a reviews subsystem.
- **Provider direction respected:** text stays Groq, vision stays Claude; only additive (embeddings, Whisper-on-Groq, optional TTS) — no swap of the primary LLM.

---

---

## Part 8 — SHIPPED (implementation log)

The roadmap was executed. All items below are implemented and pass `next build` + `tsc --noEmit`. Built with **zero new paid providers** — only the existing `GROQ_API_KEY` (`ANTHROPIC_API_KEY` absent, so vision ships dormant/env-gated).

| # | Feature | Key files | Status |
|---|---------|-----------|--------|
| F3 | Traveler DNA spine | `lib/services/travelerProfileService.ts` | ✅ |
| 3 | "For You" personalized feed | `lib/services/recommendationService.ts`, `app/api/me/for-you/route.ts`, `components/Homepage/ForYou/index.tsx`, wired in `app/page.tsx` | ✅ |
| F1 | Semantic layer (Postgres FTS, keyless) | `lib/services/ragService.ts` | ✅ |
| 2 | Cited Concierge (grounded + citation chips) | `app/api/ai/concierge/route.ts`, `components/AIChatWidget.tsx` | ✅ |
| F2/1 | Tool runtime + **Booking Agent** (draft cart, human-confirm, no auto-charge) | `lib/services/aiToolRuntime.ts`, `app/api/ai/agent/route.ts`, `components/AIChatWidget.tsx` (BOOK mode) | ✅ |
| 4 | IDR Budget Optimizer | `app/api/ai/budget/route.ts`, `components/ai/BudgetOptimizer.tsx`, wired in `ItineraryRefinePanel` | ✅ |
| 6 | Trip Guardian (real Open-Meteo weather + AI + alerts) | `app/api/cron/trip-guardian/route.ts` | ✅ |
| 4v | Voice (Groq Whisper STT + Web Speech TTS) | `app/api/ai/voice/transcribe/route.ts`, widget mic + speaker toggle | ✅ |
| 8 | Admin Content Studio | `app/api/admin/ai/content-draft/route.ts` (endpoint; wire into DestinationForm as follow-up) | ✅ endpoint |
| 7 | Group Consensus Planner | `app/api/ai/plan-consensus/route.ts`, `components/ai/GroupConsensusPlanner.tsx`, `app/ai/group/page.tsx`, hub card | ✅ |
| 5 | Snap Bali vision (identify + menu) | `app/api/ai/vision/route.ts` | ✅ dormant (needs `ANTHROPIC_API_KEY` + UI) |

**New billable AI endpoints** added to `lib/config/aiCosts.ts`: `agent` (5), `budget` (4), `voice` (1), `consensus` (8) — all use the existing reserve→settle pattern.

**Deployment follow-ups (not code):**
- Register the `trip-guardian` cron in the Vercel dashboard (daily), like the other alert crons.
- Optional: add the GIN indexes documented in `ragService.ts` for FTS performance at scale.
- To activate Snap Bali vision: set `ENABLE_AI_VISION=true` + `ANTHROPIC_API_KEY`, and build the camera UI.
- Content Studio: add a "Draft with AI" button into `DestinationForm`/`Guide` admin forms calling `/api/admin/ai/content-draft`.

*Implementation complete and build-verified.*
