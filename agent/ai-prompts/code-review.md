# AI Prompt — Code Review

> Use when asking an AI agent to **review a pull request** in this repo. Same checklist a human reviewer would use, framed for an LLM.

---

## 1. Universal review prompt

```text
Review this pull request for the Voyra Tour Bali codebase.

PR / branch: {{PR URL or `git diff master...HEAD`}}
Stated intent: {{ONE-LINE PURPOSE}}

Use this rubric, in order:

1. Correctness & intent
2. Architecture fit (per /docs/architecture.md)
3. API patterns (per /docs/api-patterns.md)
4. Coding standards (per /docs/coding-standards.md)
5. Domain invariants (per /docs/domain.md)
6. Security
7. Performance
8. Tech-debt awareness (per /docs/tech-debt.md — does this PR add debt or pay some down?)
9. Tests / manual QA (per /docs/testing-strategy.md)

For every issue found, output:
- file:line
- severity (🔴 blocker | 🟠 needs change | 🟡 nit)
- problem (one line)
- fix (one line)

Group by severity. End with a verdict: ✅ approve | 🔁 request changes | ❌ block.

Be terse. No paragraphs. No "great job!". Reviewers in this repo write tight, actionable comments.
```

---

## 2. Rubric details

### 2.1 Correctness & intent
- Does the diff do what the PR description claims?
- Any obvious bug (off-by-one, inverted boolean, wrong status code)?
- Edge cases: empty arrays, null FK, expired tokens, locked accounts.
- Race conditions (especially in webhook + cron paths).

### 2.2 Architecture fit
- File placed in the right layer (`app/api`, `lib/services`, `utils/service`, `utils/hooks`, `components`)? See [docs/architecture.md §3](../docs/architecture.md).
- Server-only modules not imported into client components.
- New third-party deps justified (and justified in [docs/architecture.md §9](../docs/architecture.md))?
- React Query / Zustand split respected (server cache vs ephemeral client state).

### 2.3 API patterns
- Auth check present where required, in the **handler** (not relying on middleware for `/api/*`).
- Validation per [docs/api-patterns.md §7](../docs/api-patterns.md).
- Status codes per [docs/api-patterns.md §4](../docs/api-patterns.md).
- Error shape `{ error }` only.
- Outbound `fetch` has `AbortSignal.timeout(...)`.

### 2.4 Coding standards
- No new `any` ([docs/coding-standards.md §10](../docs/coding-standards.md)).
- Imports use `@/` alias ([§3](../docs/coding-standards.md)).
- Hook shape canonical ([§5](../docs/coding-standards.md)).
- Files named correctly ([§2](../docs/coding-standards.md)).
- No new global CSS files.
- Comments only for non-obvious "why" ([§12](../docs/coding-standards.md)).

### 2.5 Domain invariants
- Booking lifecycle transitions valid (see [docs/domain.md §4](../docs/domain.md)).
- `BookingStatus` enum values not extended without ADR.
- `Image` polymorphism: only one parent FK set.
- Cascade rules respected; deletes do what's intended.
- Currency: IDR remains whole numbers.
- Travel date: timezone (Bali UTC+8) handled.

### 2.6 Security
- Webhooks verify signatures.
- No secrets in source (`process.env.*` everywhere).
- No PII / tokens in logs.
- bcrypt used for any password comparison.
- No widening of role checks (e.g. removing `role === "ADMIN"`).
- No CORS opened on internal routes.
- No raw Prisma error returned to client.

### 2.7 Performance
- N+1 queries — Prisma `include` used appropriately?
- Outbound calls in loops — should be batched / parallelised properly.
- `prisma.$transaction` for multi-write atomicity.
- React Query keys narrow enough that invalidation only refetches what's needed.
- Image components use `<Image>`, not raw `<img>`, unless on a page that bypasses Vercel image optimization deliberately.

### 2.8 Tech-debt awareness
- Does this PR introduce a known anti-pattern from [docs/tech-debt.md](../docs/tech-debt.md)? (e.g. another `Promise.all` instead of transaction, another `any`.)
- Does it pay down debt? Note that explicitly.
- Is it adding a third location for an entity that already has two (services, hooks, types)?

### 2.9 Tests / manual QA
- Did the PR description include a manual test plan if it touches booking, payment, or auth?
- For new endpoints, is there a manual repro path?
- For UI changes, was the dev server walkthrough done?

---

## 3. Severity guide

| Marker | Use when |
|---|---|
| 🔴 **Blocker** | Bug, security flaw, data loss risk, money-affecting code without QA |
| 🟠 **Needs change** | Pattern violation, missing auth check, new `any`, missing migration |
| 🟡 **Nit** | Style, naming, comments, minor duplication |

Block on 🔴. Request changes on 🟠. Approve with comments on 🟡-only.

---

## 4. Specialised review templates

### 4.1 Booking / payment review

```text
Review this PR with extra scrutiny — touches booking or payment.

Required checks:
- [ ] Idempotency: webhook handler safe to replay; POST creates safe to retry (idempotencyKey honoured).
- [ ] Signature verification unchanged or strengthened.
- [ ] Status transitions match /docs/domain.md §4.
- [ ] Any change to `voucherEmailed`, `paidAt`, `ticketToken` is justified in the PR body.
- [ ] No raw Midtrans payload logged.
- [ ] Manual QA plan for both Midtrans success AND cancel paths.
- [ ] `viatorBookingError` / `viatorRetryCount` accounted for if Viator path touched.

Block (🔴) on missing signature verification, missing idempotency, or money-affecting code without manual QA.
```

### 4.2 Schema / migration review

```text
Review this Prisma schema change.

Checks:
- [ ] Migration file generated (`prisma/migrations/<timestamp>_<name>/migration.sql`) and committed.
- [ ] No data loss columns dropped without an explicit drop_data confirmation.
- [ ] `onDelete` rules consistent with /docs/domain.md.
- [ ] Indexes added for fields used in `where` clauses with high cardinality.
- [ ] Enum value additions are additive (never reordering).
- [ ] No production-only `db push` — migration file is the source of truth.
- [ ] If the change affects `Booking`, `User`, or `Image`, the PR body explains the upgrade path.

Block on: dropped non-nullable columns without backfill, removed enum values, missing migration file.
```

### 4.3 Auth review

```text
Review changes to auth (utils/common/auth.ts, middleware, /api/auth/*).

Checks:
- [ ] Lockout logic preserved (3 attempts → 60s, /docs/domain.md §3.7).
- [ ] Email-verification gate preserved for USER role.
- [ ] bcrypt comparison constant-time (no early-return on mismatch).
- [ ] Turnstile check not bypassed in production.
- [ ] Session shape (`{ user: { id, email, name, role, image } }`) preserved — downstream code depends on it.
- [ ] No new credential provider added without ADR.

Block on: weakened lockout, removed Turnstile, removed email-verification gate, broken session shape.
```

### 4.4 UI review

```text
Review UI changes.

Checks:
- [ ] Server vs Client component decision sane (`"use client"` only where required).
- [ ] Tailwind classes valid; uses `clsx` for conditionals.
- [ ] Accessibility: form labels, alt text on images, button vs anchor semantics.
- [ ] No raw `<img>` where `<Image>` would do.
- [ ] React Query mutation invalidates the right key; UI reflects state during pending.
- [ ] Error states handled (not just success).
- [ ] Submit buttons disabled while pending.
- [ ] Dev-server walkthrough confirmed by the author.
```

### 4.5 Cron review

```text
Review changes to a cron handler.

Checks:
- [ ] `Authorization: Bearer ${CRON_SECRET}` checked first.
- [ ] Idempotent: re-running the cron does not double-effect.
- [ ] Logs progress at meaningful steps via `console.error` for failures and `console.log` for one-line summary.
- [ ] Bounded work — does not fetch the entire table without pagination.
- [ ] Outbound calls have timeouts.
- [ ] Deploy doc / Vercel cron config note in PR body if schedule changed.
```

---

## 5. Output format the agent should use

```
## Verdict: 🔁 request changes

### 🔴 Blockers
- `app/api/payment/notification/route.ts:45` — signature verification skipped on `if (process.env.NODE_ENV !== "production")`. Remove conditional; always verify.

### 🟠 Needs change
- `app/api/destinations/[id]/route.ts:78` — three `prisma.image.update` in `Promise.all`; wrap in `prisma.$transaction`.
- `utils/hooks/useFoo.ts:22` — mutation does not invalidate `["foos"]`; UI will show stale data.

### 🟡 Nits
- `components/Dashboard/FooForm.tsx:14` — extract repeated className into a constant.
- `lib/services/fooService.ts:30` — comment restates the code; remove.

### Notes
- Pays down /docs/tech-debt.md §2.1 by replacing two `any` casts with DTOs. Nice.
```

---

## 6. Anti-patterns in reviews

❌ Approving a PR without reading the diff.
❌ Bikeshedding on style when the rubric flags blockers.
❌ Suggesting a refactor unrelated to the PR.
❌ "LGTM 🚀" with no checks performed.
❌ Demanding tests for a repo that has none yet — flag the gap, but don't block on it unless the PR explicitly claims test coverage.
❌ Approving payment / auth changes without confirming the author ran a manual QA pass.
