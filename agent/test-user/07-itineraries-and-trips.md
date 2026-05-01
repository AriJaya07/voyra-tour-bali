---
title: 07 · Itineraries & Trips
updatedAt: 2026-05-01
---

# 07 · Itineraries & Imported Trips

## Goal

Users can: plan a trip with the AI, save itineraries, share them by slug, paste a Viator booking reference (since the widget is redirect-only), and view tickets.

## Surface area

| Concern | File |
|---|---|
| AI plan UI | [app/plan/page.tsx](../../app/plan/page.tsx) |
| AI route | [app/api/ai/](../../app/api/ai/) (Groq, llama-3.3-70b-versatile) |
| Saved itineraries | [app/api/itineraries/route.ts](../../app/api/itineraries/route.ts), [app/profile/itineraries/page.tsx](../../app/profile/itineraries/page.tsx) |
| Share | [app/share/itinerary/[slug]/page.tsx](../../app/share/itinerary/%5Bslug%5D/page.tsx) |
| Imported trips | [app/api/imported-trips/route.ts](../../app/api/imported-trips/route.ts) |
| Ticket | [app/ticket/[token]/page.tsx](../../app/ticket/%5Btoken%5D/page.tsx), [lib/ticket.ts](../../lib/ticket.ts) |
| Resend ticket | [app/api/resend-ticket/route.ts](../../app/api/resend-ticket/route.ts) |
| Survival pack | [app/profile/survival-pack/page.tsx](../../app/profile/survival-pack/page.tsx) |
| Models | `SavedItinerary`, `ImportedTrip`, `Booking` (ticketToken) |

## Preconditions

- `GROQ_API_KEY` set for AI tests.
- Signed-in user.

---

## Test cases

### TC-07-01 — AI itinerary generation

- **When** POST `/api/ai/plan` (or whichever route the page hits) with `{ prompt, days, budget, interests }`.
- **Then** Groq returns a JSON itinerary (the route should validate the shape). Response cached or streamed; UI renders day-by-day.
- Empty `GROQ_API_KEY` → 503 with friendly message; UI shows fallback.

### TC-07-02 — Save itinerary

- POST `/api/itineraries` `{ title, days[], slug?, isPublic }` → `201 SavedItinerary`. `userId` from session. Slug auto-generated if missing.

### TC-07-03 — List own itineraries

- GET `/api/itineraries` returns user's own. Includes a public flag.

### TC-07-04 — Share by slug

- GET `/share/itinerary/<slug>` (no auth required) renders the itinerary if `isPublic = true`, otherwise 404.

### TC-07-05 — Imported trip from Viator widget redirect

- **Given** user came back from Viator and pastes their booking reference.
- **When** POST `/api/imported-trips` `{ viatorBookingRef, productCode, travelDate, totalPrice, currency }`.
- **Then** `201 ImportedTrip { userId, status: "MANUAL", ... }`. Visible at `/profile` under "My trips".

### TC-07-06 — Imported trip dedupes

- Posting the same `viatorBookingRef` twice for the same user → `409 { error: "Already imported" }` (or returns the existing row, depending on current impl — verify in route).

### TC-07-07 — Ticket page renders QR

- GET `/ticket/<token>`. SSR renders product, travelers, QR. `<img>` data URL non-empty. Wrong token → 404.

### TC-07-08 — Resend ticket email

- POST `/api/resend-ticket` `{ bookingRef }` as the booking owner → `200`. SMTP fired with same template as initial confirmation. EmailDelivery row written.

### TC-07-09 — Survival pack page

- GET `/profile/survival-pack`. Renders curated items: emergency contacts, weather link, local SIM tips, ATM map link, etc. Pure static-ish content; should not require auth beyond profile gate.

---

## Manual QA checklist

- [ ] `/plan` produces an itinerary in ≤ 15 s for a sane prompt
- [ ] Save itinerary → reappears at `/profile/itineraries`
- [ ] Make itinerary public → `/share/itinerary/<slug>` renders for an anonymous incognito tab
- [ ] After "Book on Viator", come back and paste the ref into the import form → trip listed in `/profile`
- [ ] Re-pasting the same ref shows graceful dedupe message
- [ ] Click ticket link from email → QR renders; offline (turn off Wi-Fi) the page still serves from SW cache
- [ ] Click "Resend ticket" → confirmation toast; new email arrives

## Third-party / local response checklist

| Surface | Provider | Expect |
|---|---|---|
| `/api/ai/plan` | Groq llama-3.3-70b-versatile | streaming or JSON `{ days: [{...activities}] }` |
| `SavedItinerary` | local | `{ id, userId, title, days, slug, isPublic, createdAt }` |
| `ImportedTrip` | local | `{ id, userId, viatorBookingRef@unique, productCode, travelDate, totalPrice, currency, status }` |
| `Booking.ticketToken` | local | UUID string, unique per booking |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| AI returns `<thinking>...</thinking>` to the user | route forgot to strip leading reasoning | enforce `response_format: { type: "json_object" }` or post-process |
| Imported trip never shows in `/profile` | profile read filters by `Booking` only | union `Booking` + `ImportedTrip` in the dashboard query |
| Public share returns 404 even for `isPublic=true` | route gates on session unconditionally | make GET public; only the editor view is gated |
| Resend ticket sends 0 emails | unsubscribe gate triggered | confirmation emails are exempt — see [emailService.ts](../../lib/services/emailService.ts) `isUnsubscribed` whitelist |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

`/plan`, `/profile/itineraries`, `/share/itinerary/[slug]`, `/api/itineraries`, `/api/imported-trips`, `/api/resend-ticket`, `/ticket/[token]` all present.
