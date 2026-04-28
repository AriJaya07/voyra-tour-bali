# AI Prompt — Test Writing

> Use when asking an AI agent to **write tests** in this repo. Read [docs/testing-strategy.md](../docs/testing-strategy.md) first — the repo currently has zero automated tests, and the test framework is not yet installed.

---

## 1. Context the agent must know

- **No tests exist today.** No `vitest`, no `jest`, no `playwright` in `package.json`.
- The chosen framework is **Vitest** (unit + integration) and **Playwright** (E2E) per [docs/testing-strategy.md §3](../docs/testing-strategy.md). Anyone writing the first test must also wire up the framework.
- Database tests need a separate Postgres database (`DATABASE_URL_TEST`).
- External services (Midtrans, Viator, S3, SMTP) must be **mocked at the module boundary**.
- Coverage is a smoke detector, not a goal. Asserting **side effects** matters more than asserting return values.

---

## 2. Bootstrap prompt (only needed once)

```text
Bootstrap a test framework for the Voyra Tour Bali repo.

Reference: /docs/testing-strategy.md.

Tasks:
1. Add devDependencies: vitest, @vitest/coverage-v8, supertest (or @vitest/web), @types/supertest, msw (for HTTP mocks), @playwright/test.
2. Add `vitest.config.ts` at repo root:
   - test environment: "node" for integration, "jsdom" for component tests (separate projects).
   - alias `@` → repo root (mirror tsconfig).
   - setupFiles for env loading and DB bootstrap.
3. Add `__tests__/` folder with subfolders `unit/`, `integration/`, `fixtures/`.
4. Add `npm scripts`:
   - `"test": "vitest run"`
   - `"test:watch": "vitest"`
   - `"test:coverage": "vitest run --coverage"`
   - `"test:e2e": "playwright test"`
5. Add a `playwright.config.ts` with baseURL from env.
6. Add `__tests__/setup.ts` that:
   - loads `.env.test`.
   - wires `prisma` test client (separate DATABASE_URL).
   - registers global afterEach to reset DB tables (TRUNCATE ... RESTART IDENTITY CASCADE).
7. Write ONE smoke test (`__tests__/unit/formatPrice.test.ts`) that imports `utils/formatPrice.ts` and asserts `formatPrice(150000) === "Rp 150.000"` (or whatever the actual format is).
8. Document setup in /docs/testing-strategy.md if anything diverges from §3.

Do NOT add CI yet — that is a separate task.
Do NOT add tests beyond the smoke test in this PR.
```

---

## 3. Universal test-writing prompt

```text
Write tests for {{file or area}} in Voyra Tour Bali.

Reference docs:
- /docs/testing-strategy.md (what to test, in what order)
- /docs/api-patterns.md (for route handler tests)
- /docs/domain.md (for invariants the tests should encode)

Constraints:
- Use vitest (already configured at __tests__/).
- Co-locate unit tests under `__tests__/unit/`, integration tests under `__tests__/integration/`.
- Mock external services at the module boundary (`vi.mock("midtrans-client", ...)`, `vi.mock("@aws-sdk/client-s3", ...)`, etc.).
- Database tests use `DATABASE_URL_TEST`; reset between tests.
- Test names: `it("does <expected> when <state>")`.
- Group with `describe("<module path>")`.
- One assertion per intent. Multiple `expect`s in one `it` are fine if asserting one behaviour.
- Do NOT test trivial getters or pass-through code.
- Do NOT test the third-party SDK; test that we call it with the right args.

For each test file:
- Top: imports + mocks.
- describe block per function under test.
- Cover: happy path, validation failure, auth failure (if applicable), idempotency (if applicable), edge cases stated in /docs/domain.md.

Reply format:
- File created
- What it covers (bullet list)
- What it intentionally does NOT cover (out of scope)
- Run command + exit code
```

---

## 4. Specialised templates

### 4.1 Unit test for a pure utility

```text
Write `__tests__/unit/{{name}}.test.ts` for `utils/{{name}}.ts`.

Cover:
- Each input shape the function handles in production (read the call sites; pick representative inputs).
- One representative invalid input.
- Locale / timezone edge case if relevant.

Example for formatPrice:
- 0 → "Rp 0"
- 150000 → "Rp 150.000" (with thousands separator)
- 1234567 → "Rp 1.234.567"
- negative → as defined by the function (do not invent behaviour)
- non-number → as defined
```

### 4.2 Integration test for a route handler

```text
Write `__tests__/integration/{{path}}.{{verb}}.test.ts` for `app/api/{{path}}/route.ts` ({{VERB}}).

Setup:
- import the handler directly: `import { POST } from "@/app/api/{{path}}/route";`
- build a `Request` (or `NextRequest`) instance with the body.
- call `POST(req)` and assert on the `Response`.

Cover:
- Validation: missing required fields → 400.
- Auth (if protected): no session → 401.
- Auth (if admin-only): session with role !== "ADMIN" → 403.
- Happy path → expected status code + response shape.
- Conflict path (if uniqueness involved) → 409.
- Side effects on DB: query Prisma after to assert rows / state.
- Side effects on external services: assert the mock was called with the right args (e.g. `expect(snap.createTransaction).toHaveBeenCalledWith(...)`).

Mock these at module boundary:
- next-auth `getServerSession` → return a fake session.
- midtrans-client → return a fake snap token.
- @aws-sdk/client-s3 → noop.
- nodemailer.createTransport → jsonTransport for assertion on the email payload.

Reset DB rows in afterEach using TRUNCATE.
```

### 4.3 Webhook test (Midtrans)

```text
Write `__tests__/integration/payment.notification.test.ts` for `app/api/payment/notification/route.ts`.

Helper: build a signed Midtrans payload.
```ts
function signPayload(orderId: string, statusCode: string, grossAmount: string) {
  return crypto.createHash("sha512")
    .update(orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY!)
    .digest("hex");
}
```

Cases:
- Valid signature + transaction_status="settlement" → 200, booking flips to CONFIRMED, ticketToken set, email mock called once, voucherEmailed=true.
- Same payload posted twice → second call is idempotent (no second email).
- Invalid signature → 403, no DB change.
- Unknown order_id → 404.
- transaction_status="cancel" → CANCELLED.
- transaction_status="capture" + fraud_status="challenge" → still PENDING + isFraudFlagged=true.

Use a seeded booking row (from a fixture factory) per case.

Encode the rules from /docs/domain.md §4 transition rules.
```

### 4.4 Service unit test (booking lifecycle)

```text
Write `__tests__/unit/postPaymentService.test.ts` for `lib/services/postPaymentService.ts`.

Mock:
- prisma → in-memory fake or vi.mock entire `@/lib/prisma`.
- viatorService.confirmBooking → vi.fn().
- email.sendBookingConfirmation → vi.fn().

Cases for `handlePaymentSuccess(bookingId)`:
- Booking found, not yet emailed → ticketToken set, viator confirm called (if Viator), email sent, voucherEmailed=true.
- Booking already CONFIRMED + emailed → short-circuits (no second email, no second viator call).
- Viator confirm throws → status remains CONFIRMED but viatorBookingError populated, viatorRetryCount incremented.
- Email throws → voucherEmailed remains false (so cron retry can pick it up).
```

### 4.5 Hook test (React Query mutation)

```text
Write `__tests__/unit/useDestinations.test.ts`.

Setup:
- jsdom environment.
- Wrap render in `<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }}})}>`.
- Mock `utils/service/destination.service.ts` with `vi.mock`.

Cases:
- Initial render → isLoading true, then data resolves to mocked array.
- createDestination success → invalidates ["destinations"] (assert refetch happens).
- createDestination error → mutation.isError true, no invalidation.
- updateDestination + deleteDestination similar.

Use `@testing-library/react` + `renderHook`.
```

### 4.6 E2E test (Playwright)

```text
Write `e2e/booking-midtrans-success.spec.ts`.

Goal: walk a logged-in user from detail page to booking-success.

Setup:
- Use `test.beforeAll` to seed a destination and a verified user.
- `page.goto("/login")`, sign in.
- Skip Turnstile via env (`DISABLE_TURNSTILE=true` in test env).
- Mock Midtrans Snap by intercepting `https://app.sandbox.midtrans.com/snap/snap.js` and replacing window.snap with a stub that immediately calls onSuccess.
- Mock the webhook by hitting `/api/payment/notification` directly with a signed sandbox payload.

Assertions:
- Redirect lands on /booking-success.
- DB shows the booking with status CONFIRMED.
- Email outbox (jsonTransport sink) has one ticket email.

Browser: chromium only for now; expand to webkit + firefox later.
```

---

## 5. Mock catalogue

These are the standard mocks; reuse them across tests.

| Module | Mock |
|---|---|
| `next-auth` `getServerSession` | `vi.fn().mockResolvedValue({ user: { id: 1, role: "ADMIN", email: "a@a.com" } })` |
| `@/lib/prisma` | either real test DB (preferred for integration), or `vitest-mock-extended` for unit tests of services |
| `midtrans-client` | `vi.fn(() => ({ createTransaction: vi.fn().mockResolvedValue({ token: "snap_xxx" }) }))` |
| `@aws-sdk/client-s3` | `vi.fn(() => ({ send: vi.fn().mockResolvedValue({}) }))` |
| `nodemailer.createTransport` | `vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({ messageId: "test" }) }))` |
| `@/utils/verifyTurnstile` | `vi.fn().mockResolvedValue(true)` |
| Outbound `fetch` to Viator | use `msw` (Mock Service Worker) handlers in `__tests__/setup.ts` |

---

## 6. Things you MUST NOT do in tests

❌ Hit live Midtrans, Viator, or Brevo APIs.
❌ Use the dev DB. Always `DATABASE_URL_TEST`.
❌ Write to S3.
❌ Send real emails.
❌ Skip a test with `.skip` to make CI green.
❌ Sleep / setTimeout to "wait for state" — use proper async assertions.
❌ Test private internals of Prisma or NextAuth — assert on **our** behaviour around them.
❌ Add tests that depend on environment variables not present in `.env.test`.

---

## 7. Reply format the agent should produce

```
## Tests added: {{count}}

### Files
- `__tests__/integration/payment.notification.test.ts` — 6 cases
- `__tests__/fixtures/midtrans.ts` — payload + signature helper

### Coverage
- Validates signature path (positive + negative).
- Status mapping for capture/settlement/cancel/expire.
- Idempotency on replay.
- Side effects: ticket generation, email send, viator confirm.

### Run
✅ `npx vitest run __tests__/integration/payment.notification.test.ts` — 6 passed in 1.2s

### Out of scope (for follow-up)
- Cron retry path for failed emails (see /docs/tech-debt.md §6.1).
- Refund webhook handling.
```
