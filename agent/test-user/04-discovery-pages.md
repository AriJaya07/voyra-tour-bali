---
title: 04 · Discovery Pages
updatedAt: 2026-05-01
---

# 04 · Discovery Pages

## Goal

Every page a visitor or signed-in user can browse renders without crashing, returns a 200, and exposes the right data: home, blog, destination, detail, tour-guide profile, Bali events, /compare, /notes, search, plan, FAQ, help, status, legal pages.

## Surface area

| Concern | File |
|---|---|
| Home | [app/page.tsx](../../app/page.tsx), [components/Homepage/](../../components/Homepage/) |
| Blog list / detail | [app/blog/page.tsx](../../app/blog/page.tsx), [app/blog/[id]/page.tsx](../../app/blog/%5Bid%5D/page.tsx) |
| Destinations | [app/api/destinations/route.ts](../../app/api/destinations/route.ts), `Destination` model |
| Tour detail | [app/detail/[slug]/page.tsx](../../app/detail/%5Bslug%5D/page.tsx), [components/DetailProduct/](../../components/DetailProduct/) |
| Search | [app/search/page.tsx](../../app/search/page.tsx) |
| Plan / itinerary | [app/plan/page.tsx](../../app/plan/page.tsx) |
| Bali events | [app/bali-events/page.tsx](../../app/bali-events/page.tsx), [app/api/bali-events/route.ts](../../app/api/bali-events/route.ts) |
| Tour-guide profile | [app/guides/profiles/[slug]/page.tsx](../../app/guides/profiles/%5Bslug%5D/page.tsx), [app/api/tour-guides/route.ts](../../app/api/tour-guides/route.ts) |
| Guides (CMS articles) list | [app/guides/page.tsx](../../app/guides/page.tsx), [app/guides/[slug]/page.tsx](../../app/guides/%5Bslug%5D/page.tsx) |
| Compare | [app/compare/page.tsx](../../app/compare/page.tsx) |
| Notes feed | [app/notes/page.tsx](../../app/notes/page.tsx), [app/api/notes/feed/route.ts](../../app/api/notes/feed/route.ts) |
| Notes per-target | [app/notes/[targetType]/[slug]/page.tsx](../../app/notes/%5BtargetType%5D/%5Bslug%5D/page.tsx) |
| Status | [app/status/page.tsx](../../app/status/page.tsx) |
| Legal | [app/privacy/page.tsx](../../app/privacy/page.tsx), [app/terms/page.tsx](../../app/terms/page.tsx), [app/cancellation-policy/page.tsx](../../app/cancellation-policy/page.tsx), [app/trust-and-safety/page.tsx](../../app/trust-and-safety/page.tsx), [app/help/page.tsx](../../app/help/page.tsx), [app/faq/page.tsx](../../app/faq/page.tsx), [app/about/page.tsx](../../app/about/page.tsx), [app/contact/page.tsx](../../app/contact/page.tsx) |
| Sitemap / robots | [app/sitemap.ts](../../app/sitemap.ts), [app/robots.ts](../../app/robots.ts) |

---

## Test cases

### TC-04-01 — Home returns 200 with hero + featured strip

- GET `/`. Body has `<h1>` containing "Bali" or the configured hero copy. Featured tour cards render. Service worker registration link/script in head.

### TC-04-02 — Blog list paginated

- GET `/blog`. Lists `Content` rows where `isAvailable = true`, ordered by `dateAvailable` desc. Click a card → `/blog/[id]` renders the body.

### TC-04-03 — Destination page renders nested content

- GET `/destination/<slug>` (or whichever route is wired). Server-side fetch returns `Destination { contents[], locations[], images[] }`. Each section heading present.

### TC-04-04 — Tour detail (Viator-backed)

- GET `/detail/<productCode>`. Server pulls product detail via `?action=product_detail`. Page shows price, rating, duration, inclusions, exclusions. Sticky CTA visible on mobile.

### TC-04-05 — Tour-guide profile page

- GET `/guides/profiles/aris-wirawan` (sample slug).
- **Then** `200`. Hero shows photo (or initial fallback), name, "★ rating (n reviews)", years guiding, language pills, bio paragraphs split on `\n\n`. CTA "Browse tours" links to `/`. Slug not found → `notFound()` → 404.
- Metadata: `<title>` is `"<name> — Bali Tour Guide | …"`. Canonical URL points at `/guides/profiles/<slug>`.
- ISR: `revalidate = 3600` (verify build output mark).

### TC-04-06 — Bali events page

- GET `/bali-events`. List from [app/api/bali-events/route.ts](../../app/api/bali-events/route.ts) ordered by `date asc`. Each row: type badge (NYEPI / FESTIVAL / CEREMONY / PUBLIC_HOLIDAY), date, "in N days" indicator. Past events filtered out (or marked).

### TC-04-07 — `/compare` empty state

- GET `/compare` (no `?codes=`). Shows empty state with "Browse tours" CTA. No fetch fired.

### TC-04-08 — `/compare?codes=A,B,C`

- GET `/compare?codes=PRD-A,PRD-B,PRD-C`. Three columns render. Each fires `/api/viator?action=product_detail&productCode=…` once. Remove (✕) button updates URL to `/compare?codes=PRD-A,PRD-C` and re-renders.

### TC-04-09 — `/compare` clamps at 4

- GET `/compare?codes=A,B,C,D,E` shows 4 columns; `E` ignored.

### TC-04-10 — `/compare` graceful failure

- One product returns `null` → that column shows "Unable to load <code>" with a remove button. Other columns still render.

### TC-04-11 — `/notes` index feed

- GET `/notes`. Loads 20 latest `BaliNote { visibility:"PUBLIC", status:"APPROVED" }`. Filter chips (All / Tours / Destinations / Places) toggle the `targetType` query param. "Load more" button increases offset.
- API: `/api/notes/feed?limit=20&offset=0` → `{ items, total, hasMore }`.

### TC-04-12 — `/notes` empty state

- DB with zero approved public notes → "No notes yet" empty card.

### TC-04-13 — `/notes/<targetType>/<slug>` per-target page

- GET. Shows all approved public notes for that target, with `ratingAvg` and `ratingCount` aggregate. Comes from [app/api/notes/public/route.ts](../../app/api/notes/public/route.ts).

### TC-04-14 — Search page

- GET `/search?q=ubud`. Calls `/api/viator?action=search`. Results paginated; empty query shows tip.

### TC-04-15 — Plan page (AI itinerary)

- GET `/plan`. Renders the day picker + AI prompt input. No fetch on page load. See [07-itineraries-and-trips.md](./07-itineraries-and-trips.md) for the AI flow.

### TC-04-16 — Status page

- GET `/status`. Shows checkmarks for each subsystem (DB ping, Viator reachable, SMTP credential present). All client-side or thin server check — must not be locked behind auth.

### TC-04-17 — Legal pages

- GET each of `/privacy`, `/terms`, `/cancellation-policy`, `/trust-and-safety`, `/help`, `/faq`, `/about`, `/contact`. All return 200, none mention "Viator" by name (uses generic "trusted booking partner" wording per the Phase-15 directive).

### TC-04-18 — Sitemap + robots

- GET `/sitemap.xml` → XML with `/`, `/blog/*`, `/destination/*`, `/detail/*`, `/guides/*`, `/notes`, `/bali-events`. GET `/robots.txt` → allows main, disallows `/dashboard`, `/api`, `/profile`.

---

## Manual QA checklist

- [ ] `/` loads ≤ 3 s on cable; hero, featured strip, footer all render
- [ ] `/blog` lists posts; clicking opens detail
- [ ] `/detail/<known-product>` renders fully; sticky CTA visible on mobile
- [ ] `/guides/profiles/<slug>` renders with photo or initial fallback
- [ ] `/bali-events` shows upcoming events with correct "in N days" labels
- [ ] `/compare` empty → CTA; with `?codes=A,B` → side-by-side; remove ✕ updates URL
- [ ] `/notes` shows recent approved notes; filter chips work; "Load more" appends
- [ ] `/search?q=ubud` returns ≥ 1 result
- [ ] `/status` reachable without auth, shows green/red per subsystem
- [ ] All footer pages reachable; none crash; legal pages do not name "Viator"
- [ ] `/sitemap.xml` and `/robots.txt` return 200

## Third-party / local response checklist

| Surface | Provider | Expect |
|---|---|---|
| `/compare` rows | Voyra `/api/viator?action=product_detail` | merged detail per TC-03-03 |
| `/notes` items | Local `BaliNote` | `{ id, targetType, targetKey, targetTitle, body, rating, createdAt, user{name,image} }` |
| `/bali-events` items | Local `BaliEvent` | `{ id, slug, name, date, type, region, description, link }` |
| `/guides/profiles/[slug]` | Local `TourGuide` | `{ id, slug, name, photo, bio, languages, yearsActive, rating, reviewCount }` |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `/compare` shows spinner forever | one of the codes hits a 502; Promise.all swallowed | wrap each call in `.catch(() => null)` (already done) |
| `/notes` shows duplicates after "Load more" | offset reset on filter change but state not cleared | the page resets `offset` to 0 on filter change (verify) |
| `/bali-events` empty | seeded events `date < now()` filtered; or cache stale | re-seed; check `revalidate` value |
| Tour-guide profile 404 for known slug | `slug` column changed casing | confirm slug stored lowercased; the route `notFound()` is correct behaviour |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

Confirm all routes above appear in build output.
