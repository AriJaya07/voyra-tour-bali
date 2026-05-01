# Testing Strategy — Voyra Tour Bali

> Current state, target state, and the ramp between them. Read before introducing any test framework.
>
> **Companion**: [../test-user/](../test-user/) — one file per feature area with concrete `Given/When/Then` cases, manual QA checkboxes, third-party + local response shapes. This file talks about the framework choice; that folder talks about what to actually verify.

---

## 1. Current State (truth)

- **No automated tests** in the repo. No `*.test.ts`, no `*.spec.ts`, no `jest.config.*`, no `vitest.config.*`.
- `package.json` has no `test` script and no test dependencies.
- All quality assurance is **manual**:
  1. Local dev (`npm run dev`) walkthrough of the booking flow.
  2. Midtrans sandbox + Viator mock mode (`VIATOR_MOCK_BOOKING=true`).
  3. Vercel Preview deploys for stakeholder sign-off.

This is honest, not aspirational. Don't claim coverage we don't have.

---

## 2. Why We're Adopting Tests

Bookings move money. The webhook → booking → ticket → email chain has too many failure points to keep verifying by hand for every change. The first phase below is non-negotiable before scaling the team beyond the current ~1 maintainer.

---

## 3. Target Pyramid

```
              ┌──────────────────┐
              │   Manual / QA    │  exploratory, accessibility, visual
              └──────────────────┘
            ┌───────────────────────┐
            │     E2E (Playwright)  │  ~10 tests, golden paths
            └───────────────────────┘
       ┌──────────────────────────────────┐
       │  Integration (vitest + supertest │
       │   or vitest + Next test util)    │  per route handler
       └──────────────────────────────────┘
   ┌──────────────────────────────────────────┐
   │             Unit (vitest)                │  pure functions, services
   └──────────────────────────────────────────┘
```

Stack chosen for compatibility with Next 16 + ESM:
- **Vitest** — unit + integration. Native ESM, Vite-fast, Jest-compatible API.
- **Playwright** — E2E in real browsers.
- **Prisma test helper** — separate database (`DATABASE_URL_TEST`) reset between suites via `prisma migrate reset --skip-seed`.

---

## 4. What to Test, Ranked

### 4.1 🔴 Must (Phase 1)

| Surface | Reason | Type |
|---|---|---|
| `app/api/payment/notification/route.ts` | Money + status transitions + email side-effect. Webhook signature verification. | Integration (POST with mock payload + signature) |
| `lib/services/postPaymentService.handlePaymentSuccess` | Generates ticket, calls Viator, sends email, credits loyalty + referral conversion. Idempotency. | Unit + integration |
| `lib/services/bookingService.ts` | Create-booking branching (Viator vs Midtrans). | Unit |
| `app/api/bookings/local/route.ts` (POST) | Idempotency key, traveller create, snap token issue. | Integration |
| `app/api/loyalty/redeem/route.ts` | 1000-pt increments, balance gate, ledger write. | Integration |
| `app/api/auth/register/route.ts` | Referral signup credit (+200 pts), email send. | Integration |
| `lib/services/emailService.sendTrackedEmail` | Unsub gate, EmailDelivery row, pixel + click rewrite. | Unit |
| `utils/common/auth.ts` (NextAuth callbacks) | Lockout, email-verification gate, bcrypt path. | Unit |
| `utils/verifyTurnstile.ts` | Verifies the Cloudflare token correctly; fails closed. | Unit |
| `utils/formatPrice.ts` | IDR formatting; locale; whole-number assumption. | Unit |

### 4.2 🟠 Should (Phase 2)

| Surface | Reason |
|---|---|
| Each `app/api/<entity>/route.ts` CRUD | Validation, 400/401/409/500 paths |
| Each cron route | Auth header check, success path |
| `utils/common/middleware.ts` | Route protection matrix (`/dashboard`, `/profile`, …) |
| `utils/hooks/use<Entity>` | React Query invalidation contract |
| Image link / unlink lifecycle | S3 + Prisma in lockstep |

### 4.3 🟡 Nice (Phase 3)

| Surface | Reason |
|---|---|
| Email template rendering snapshots | Prevents accidental layout breakage |
| Sitemap / robots generation | SEO regressions |
| AI chat widget guardrails | No structured guarantee, but smoke tests |

### 4.4 E2E Golden Paths (Playwright, ~12 tests)

1. Visitor browses homepage → category → destination detail.
2. Visitor signs up with email → receives verification (mock SMTP) → verifies → logs in.
3. User books a tour with Midtrans sandbox (success path).
4. User books a tour with Midtrans sandbox (cancel path).
5. User views booking history; expired pending booking auto-removed.
6. User opens ticket page from email link.
7. Admin logs in → creates a destination with images.
8. Admin updates a booking status.
9. Forgot-password full round trip.
10. Locked-out account after 3 failed logins; unlock after 60 s.
11. `/compare?codes=A,B,C` renders side-by-side and supports per-column remove (✕ updates URL).
12. Cookie consent banner appears on first visit, persists across reload, and does not show on `/dashboard/*`.

---

## 5. What Not to Test (Yet)

- **Prisma queries themselves** — Prisma is a dependency; trust it. Test that we *call* it correctly, not that it returns rows.
- **Tailwind / styling** — visual regression tools belong in Phase 3.
- **Third-party SDKs** (`midtrans-client`, `cloudinary`, `@aws-sdk`) — mock at the edge; do not test the SDK.
- **Trivial getters / pass-through services** — coverage for coverage's sake.

---

## 6. Conventions (when we start writing)

### 6.1 Layout
```
__tests__/
  unit/
    formatPrice.test.ts
    auth.callbacks.test.ts
  integration/
    bookings.local.post.test.ts
    payment.notification.test.ts
  fixtures/
    midtransPayloads.ts
    viatorResponses.ts
e2e/
  booking-midtrans-success.spec.ts
  ...
```

Co-located `*.test.ts` next to source is also acceptable for unit tests of small utils.

### 6.2 Naming
- `describe("<unit under test>")` → exact module path.
- `it("does <expected behaviour> when <state>")`.

### 6.3 Database for integration tests
- Spin Postgres via Docker (`postgres:16`) or use a hosted test DB.
- One DB per worker (`DATABASE_URL=postgresql://.../voyra_test_${WORKER}`).
- `globalSetup` runs `prisma migrate deploy` then truncates tables between tests using a transaction wrapper or `TRUNCATE ... CASCADE`.
- **Never share state with dev DB.**

### 6.4 Mocking external services
- Midtrans, Viator, S3, SMTP — mock at the **module boundary** (`vi.mock("midtrans-client", ...)`).
- Cloudflare Turnstile — env-flag `DISABLE_TURNSTILE=true` short-circuit accepted in `verifyTurnstile`.
- Email — Nodemailer with `jsonTransport` in test mode; assert on captured payloads.

### 6.5 Data factories
Use plain functions (`makeBooking({ status: "PENDING" })`) over heavyweight libraries. Keep them in `__tests__/fixtures`.

### 6.6 Asserting webhook signatures
Build a small helper in fixtures:
```ts
export function midtransSign(orderId: string, statusCode: string, grossAmount: string, key: string) {
  return crypto.createHash("sha512")
    .update(orderId + statusCode + grossAmount + key)
    .digest("hex");
}
```

---

## 7. Coverage Expectations

- Phase 1 target: **70%** lines on `lib/services/*` and `app/api/payment/**` and `app/api/bookings/**`.
- Phase 2 target: **60%** lines repo-wide.
- Treat coverage as a **smoke detector**, not a goal. A 100%-covered handler that doesn't assert the webhook side-effects is worthless.

---

## 8. CI

When tests land, add a GitHub Actions workflow:

```yaml
- name: install
  run: npm ci
- name: typecheck
  run: npx tsc --noEmit
- name: lint
  run: npm run lint
- name: unit + integration
  run: npx vitest run
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/voyra_test
- name: e2e
  run: npx playwright test
  env:
    BASE_URL: http://localhost:3000
```

Block merges to `master` on red CI.

---

## 9. Manual QA Checklist (today, until tests exist)

Run before every production deploy:

- [ ] Sign up as new email → receive verification email (Brevo sandbox) → verify → log in.
- [ ] Forgot password → reset → log in with new password.
- [ ] Browse `/`, click a featured destination, view detail page.
- [ ] Book a tour with Midtrans sandbox (test card `4811 1111 1111 1114`).
- [ ] Cancel during Snap → booking remains `PENDING` → auto-cleanup after 24 h.
- [ ] Confirm booking → ticket email arrives → `/ticket/[token]` renders QR.
- [ ] As admin, create a destination with 3 images, 1 content, 1 location → verify nested fetch.
- [ ] Trigger `/api/cron/auto-complete-bookings` with `Bearer ${CRON_SECRET}` → confirmed-with-past-travelDate flips to COMPLETED.
- [ ] Trigger `/api/cron/viator-sync` (mock mode OK) → no errors.

---

## 10. Owner

Until a dedicated QA exists, the **author of the change** is responsible for proving the change works. Reviewers should reject PRs that change booking, payment, or auth code without at least a manual checklist update in the PR description.
