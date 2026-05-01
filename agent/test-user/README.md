# Test-User Suite — Voyra Tour Bali

> TDD-style test specs covering every page, API route, and external integration shipped through Phase 16+. Use this as the source of truth when:
> - Writing automated tests (Vitest unit/integration, Playwright E2E)
> - Running manual QA before a deploy
> - Verifying a third-party integration's response shape after an SDK upgrade
> - Reviewing PRs that touch booking, payment, auth, or admin code

The repo currently has **no automated tests** (see [../docs/testing-strategy.md](../docs/testing-strategy.md)). These specs are the contract automated tests must satisfy when added. Until then, they double as exhaustive manual QA scripts.

---

## Conventions used in every file

Each spec uses the same five-section shape so reviewers can scan quickly:

1. **Goal** — what the feature must do, in one sentence.
2. **Surface area** — files / routes / models touched (with clickable paths).
3. **Preconditions** — env vars, fixtures, role, and DB state required.
4. **Test cases** — `Given … / When … / Then …`. Each case is small enough to translate 1:1 into a Vitest `it(...)` or Playwright `test(...)`.
5. **Manual QA checklist** — copy-pasteable boxes for pre-deploy.
6. **Third-party / local response check** — exact JSON shape we expect back.
7. **Failure modes** — known ways this breaks, and how to spot them.

Every spec ends with a **Build verification** step. Treat any spec whose build fails as red.

---

## Index

| # | File | Covers |
|---|---|---|
| 00 | [00-preflight.md](./00-preflight.md) | Env vars, DB, Prisma, build + typecheck baseline |
| 01 | [01-auth-and-account.md](./01-auth-and-account.md) | Register, login, OAuth, lockout, email verify, profile, settings, travelers |
| 02 | [02-booking-and-payment.md](./02-booking-and-payment.md) | Local booking, Midtrans Snap, webhook, post-payment side-effects |
| 03 | [03-viator-integrations.md](./03-viator-integrations.md) | Products, search, detail, availability, redirect widget, sync |
| 04 | [04-discovery-pages.md](./04-discovery-pages.md) | Home, blog, destinations, detail, guide profiles, events, /compare, /notes, search |
| 05 | [05-personalization.md](./05-personalization.md) | Wishlist, recently-viewed (24h TTL), currency, travel-profile, calendar |
| 06 | [06-loyalty-and-referral.md](./06-loyalty-and-referral.md) | Earn, tier, redeem, referral signup credit, conversion credit |
| 07 | [07-itineraries-and-trips.md](./07-itineraries-and-trips.md) | Saved itineraries, AI plan, share link, imported-trips, ticket page |
| 08 | [08-admin-cms.md](./08-admin-cms.md) | Admin dashboard pages + CRUD APIs (operators, guides, destinations, content, images, reviews, subscribers, viator-mock) |
| 09 | [09-cron-and-jobs.md](./09-cron-and-jobs.md) | Every `/api/cron/*` route — auth, schedule, side-effects |
| 10 | [10-comms-and-notifications.md](./10-comms-and-notifications.md) | Email service (send/track/unsub), push subscribe/notify, cookie consent |
| 11 | [11-pwa-and-status.md](./11-pwa-and-status.md) | Manifest, service worker, icons, offline, status page |
| 12 | [12-third-party-checklist.md](./12-third-party-checklist.md) | Per-vendor expected response + failure handling |
| 13 | [13-local-checklist.md](./13-local-checklist.md) | Per-Prisma-model invariants + per-route response shape |
| 14 | [14-tdd-templates.md](./14-tdd-templates.md) | Copy-paste Vitest + Playwright skeletons matched to the patterns above |

---

## Suggested execution order (full pre-deploy run)

1. `00-preflight` — fail fast on missing env or red build.
2. `01-auth-and-account` — without auth, nothing else can be exercised.
3. `12-third-party-checklist` (smoke section only) — confirm Midtrans sandbox, Viator key, SMTP, S3 reachable.
4. `02-booking-and-payment` — money path. Always run end-to-end against Midtrans sandbox.
5. `03-viator-integrations` — most volatile upstream.
6. `04-discovery-pages` → `07-itineraries-and-trips` — visitor + signed-in journeys.
7. `05`, `06`, `08`, `10`, `11` — personalization, growth, admin, comms.
8. `09-cron-and-jobs` — trigger each cron with `Bearer ${CRON_SECRET}` and assert no 500.
9. `13-local-checklist` — sanity sweep of every list/CRUD endpoint shape.

Each file is self-contained; nothing in §3+ depends on §1 having passed (you can drop straight in to debug a single feature).

---

## How to run the manual QA checklist

```bash
# 1. fresh local
git pull
npm install
npx prisma migrate deploy
npx tsc --noEmit
npx next build

# 2. dev server
npm run dev   # http://localhost:3000

# 3. seed (first time only)
npx prisma db seed

# 4. open each spec, walk the checklist, tick boxes in your PR description
```

Use Midtrans sandbox card `4811 1111 1111 1114`. Use `NEXT_PUBLIC_VIATOR_MOCK_BOOKING=true` so Viator stays cheap. Use `DISABLE_TURNSTILE=true` if `utils/verifyTurnstile.ts` supports it locally; otherwise keep your test site key handy.

---

## How to translate a spec into automated tests

Pick the spec, then:

1. **Unit** — anything tagged `Type: Unit` in the spec. Wire via Vitest. Mock at module boundary (`vi.mock("midtrans-client", ...)`).
2. **Integration** — anything tagged `Type: Integration`. Use Vitest + a separate test DB (`DATABASE_URL_TEST`). Truncate between tests.
3. **E2E** — anything tagged `Type: E2E`. Playwright against `http://localhost:3000` with a seeded test admin and a Midtrans sandbox account.

[14-tdd-templates.md](./14-tdd-templates.md) has a working skeleton for each.

---

## Updating these specs

When you add a feature:

1. Pick the matching spec file (or add a new one with the next free number).
2. Add a new test case with `Given/When/Then`.
3. Add the route/file to the **Surface area** table at the top of that spec.
4. If you added a new third-party call, append a row to [12-third-party-checklist.md](./12-third-party-checklist.md).
5. If you added a new Prisma model, append a row to [13-local-checklist.md](./13-local-checklist.md).
6. Bump the date in the file's frontmatter (`updatedAt`).

If a spec drifts from reality, fix the spec — never delete failing checks "for now".
