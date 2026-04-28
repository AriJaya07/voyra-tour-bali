# AI Prompt — Bug Fix

> Use when asking an AI agent to **diagnose and fix a bug**. The goal is a minimal, root-cause fix — not a refactor.

---

## 1. Universal bug fix template

```text
Diagnose and fix the following bug in Voyra Tour Bali.

Bug:
{{ONE-LINE STATEMENT — what is broken}}

Steps to reproduce:
1. {{STEP}}
2. {{STEP}}
3. {{STEP}}

Expected: {{WHAT SHOULD HAPPEN}}
Actual:   {{WHAT HAPPENS INSTEAD}}

Environment:
- Where seen: {{local | preview | production}}
- User role: {{guest | USER | ADMIN}}
- Browser/device (if UI): {{...}}
- First seen: {{date or commit ref}}

Logs / errors:
```
{{PASTE EXACT ERROR / STACK / NETWORK RESPONSE — DO NOT PARAPHRASE}}
```

Constraints:
- Read /docs/architecture.md, /docs/api-patterns.md (if API), /docs/domain.md (if booking/payment) before making changes.
- Find the **root cause**, do not patch symptoms. State the root cause in one sentence in your reply.
- Make the **minimal** change that fixes the bug. No incidental refactor.
- Preserve existing public API shape.
- No new env vars or dependencies unless strictly needed (justify if so).
- Add a comment explaining the *why* if the fix is non-obvious (workaround for upstream quirk, hidden invariant, etc.). See /docs/coding-standards.md §12.
- After the fix, run `npm run lint` and `npm run build`. Walk through the repro steps in the browser if UI-affecting.

Reply format:
1. Root cause (one sentence)
2. Files changed (bullet list with paths + line ranges)
3. Why this is minimal (what you intentionally did NOT change)
4. Manual verification steps performed
5. Regression risk (what else could this affect?)
```

---

## 2. Triage checklist (use before writing the prompt)

- [ ] Repro confirmed locally? (If not, ask the agent to reproduce first.)
- [ ] Frequency: every time / intermittent / one-off?
- [ ] Blast radius: blocks user → P0; degrades UX → P1; cosmetic → P2.
- [ ] Touches money / auth / data integrity? → mandatory manual QA after fix.
- [ ] Recent commit suspected? Include `git log --oneline -20` if so.

---

## 3. Common bug families & where to look

| Symptom | First place to check |
|---|---|
| `The table 'public.X' does not exist` after schema change | Stale Prisma cache — see [README "Stale Prisma Cache"](../README.md). Run the cache-clear sequence. |
| Booking stuck in `PENDING` after payment | `app/api/payment/notification/route.ts` — signature verify, status mapping, then `lib/services/postPaymentService.ts` |
| Customer didn't receive ticket email | `lib/email.ts` (SMTP), `lib/services/postPaymentService.ts` (`voucherEmailed` flag), Brevo dashboard |
| Login fails silently | `utils/common/auth.ts` — verify `emailVerified` gate and `loginAttempts` lockout |
| 401 on admin API call | The handler is missing `getServerSession` + role check; middleware does NOT run on `/api/*` |
| "Account locked" appears unexpectedly | `User.loginAttempts` / `loginLockedUntil` — race with form re-submits or stale cookie |
| Image broken after upload | S3 bucket policy or `next.config.ts` `images.remotePatterns` |
| Viator availability returns empty | Check `VIATOR_MOCK_BOOKING` env, `VIATOR_API_KEY` set, network 4xx vs 5xx |
| Snap iframe never appears | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` missing or env mismatch (production vs sandbox) |
| Cron returns 401 | `Authorization: Bearer ${CRON_SECRET}` header not set in Vercel cron |
| HMR loses Prisma client / "Too many connections" | `lib/prisma.ts` global singleton; check no rogue `new PrismaClient()` |
| React Query data stale after mutation | mutation `onSuccess` not invalidating the right key — see /docs/coding-standards.md §5 |
| `any` errors creeping into compile | DTOs missing — define before patching |

---

## 4. Specialised templates

### 4.1 Payment / webhook bug

```text
Bug in payment confirmation flow. {{symptom}}.

Investigate in this order:
1. Did Midtrans send the webhook? Check Midtrans dashboard → Transactions → notification log.
2. `app/api/payment/notification/route.ts` — does signature verification pass? (sha512 of order_id+status_code+gross_amount+SERVER_KEY)
3. Status mapping — Midtrans `transaction_status` + `fraud_status` → `BookingStatus` (see /docs/api-patterns.md §8).
4. `lib/services/postPaymentService.handlePaymentSuccess` — ticket generation, Viator confirm, email.
5. `Booking.voucherEmailed` flag — is the email idempotency check accidentally skipping the send?

Reply with:
- Which of the 5 steps was the failure point.
- The root-cause line(s) of code.
- Whether the fix needs a backfill for already-affected bookings (and a one-off script if so).
```

### 4.2 Authentication bug

```text
Auth bug. {{symptom}}.

Investigate:
1. `utils/common/auth.ts` — credentials authorize() callback.
2. `verifyTurnstile` — Cloudflare token validation; failing closed?
3. `User.emailVerified` — gate for USER role.
4. `User.loginAttempts` / `loginLockedUntil` — lockout window logic.
5. NextAuth `session` / `jwt` callbacks — role / id propagation into session.

Reply with the root cause and confirm:
- Lockout window remains 60s (do not change).
- Email-verification gate remains in place for USER role only (ADMIN/EDITOR exempt).
- No PII or password material added to logs.
```

### 4.3 Data integrity bug (orphans, half-writes)

```text
Data integrity bug: {{symptom — e.g. images orphaned, content created without parent}}.

Investigate:
1. The handler touching multiple tables — likely uses Promise.all instead of `prisma.$transaction`. See /docs/tech-debt.md §1.1.
2. Schema cascade rules — verify in /prisma/schema.prisma.
3. Polymorphic Image rows — verify exactly one parent FK is set.

If the handler uses Promise.all for dependent writes, fix by wrapping in `prisma.$transaction(async (tx) => { ... })`. Use `tx` instead of `prisma` inside.
Backfill: write a one-off script in /scripts (gated behind a CLI flag) to clean up any orphans created by the bug. Do not run it without explicit human approval.
```

### 4.4 UI bug

```text
UI bug on {{page/component}}. {{symptom}}.

Investigate:
1. Reproduce in `npm run dev`.
2. Check React Query cache via Devtools — is the query stale?
3. Check `"use client"` boundary — is the component accidentally a Server Component using browser APIs?
4. Check Tailwind class typos — Tailwind v4 silently drops unknown utilities.
5. Check `clsx` conditions for inverted logic.

Reply with:
- The exact component file + line.
- Before/after JSX or className diff.
- Confirmation you opened it in the browser and the bug is gone.
```

### 4.5 Performance bug

```text
Performance issue: {{page/endpoint}} takes {{time}}.

Investigate:
1. Network tab — large payloads? N+1 from missing `include`?
2. Prisma query — add `console.time` around the call. Are we loading the full table?
3. Image weight — is the image hitting S3 raw or going through `<Image>` optimization?
4. React Query: is data refetching on every mount because no staleTime?

Reply with measured before/after numbers and the single change that moved the needle. If the bottleneck is structural (e.g. needs pagination), say so and stop — open a separate task instead of half-fixing.
```

---

## 5. After the fix

The agent must:

1. Restate the root cause in one line.
2. List files changed with paths.
3. Confirm `npm run lint` and `npm run build` pass.
4. Provide a manual repro test that now shows the fix.
5. Flag any latent issues spotted while reading the code (do not fix them in this PR — file them).

---

## 6. Anti-patterns

❌ "Just add a try/catch around it" — that hides root cause.
❌ "Add a feature flag to disable the broken path" — only acceptable as an emergency mitigation, paired with a real fix.
❌ "Update all callers to handle the broken state" — fix the source.
❌ "Refactor the entire service layer" — out of scope for a bug fix.
❌ "Skip the migration since it's only on local" — every schema change ships a migration.
❌ Patching with retry loops to mask flaky behavior — find why it's flaky.
