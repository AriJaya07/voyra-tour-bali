# Agent Rules — Voyra Tour Bali

> Operating contract for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in this repo. Read this first, every session.

---

## 1. Read these before changing code

| Doc | When |
|---|---|
| [docs/architecture.md](./docs/architecture.md) | Always — to know where things live |
| [docs/coding-standards.md](./docs/coding-standards.md) | Before writing TS/React |
| [docs/api-patterns.md](./docs/api-patterns.md) | Before adding/modifying any `app/api/**/route.ts` |
| [docs/domain.md](./docs/domain.md) | Before changing booking, payment, or schema |
| [docs/tech-debt.md](./docs/tech-debt.md) | Before "while I'm here" cleanups |
| [docs/environment.md](./docs/environment.md) | Before adding env vars or third-party integrations |
| [docs/testing-strategy.md](./docs/testing-strategy.md) | Before introducing tests / test framework |
| [test-user/README.md](./test-user/README.md) | Before shipping a feature — for the manual QA checklist + per-feature acceptance criteria + third-party / local response shapes |

If a request would change something covered above, **cite the doc and follow it**. If you must deviate, say so explicitly and justify.

---

## 2. Tools the agent may use

- **Read / Edit / Write** — preferred over shell `cat` / `sed` / `echo`.
- **Bash** — `git`, `npm`, `npx prisma …`. Long-running commands (`npm run dev`, `next build`) use a background runner.
- **TodoWrite** — track multi-step work.
- **Search agents** — for exploring the codebase before editing.

---

## 3. What to do

✅ **Do**

- Match existing patterns (file naming, hook shape, route handler skeleton, service layer split).
- Use the `@/` path alias for imports.
- Use `prisma` from `@/lib/prisma` — never instantiate `PrismaClient`.
- Use `getServerSession(authOptions)` for auth checks; admin routes also gate by `role === "ADMIN"`.
- Wrap multi-step writes in `prisma.$transaction([...])`.
- Always set `AbortSignal.timeout(120_000)` (or sensible value) on outbound `fetch`.
- Use `console.error("Error <action>:", error)` and return `NextResponse.json({ error }, { status })`.
- Invalidate matching React Query keys after mutations.
- Run `npm run lint` and `npm run build` before declaring a task done.
- For schema changes: edit `prisma/schema.prisma`, run `npx prisma migrate dev --name <descriptive>`, commit the generated migration files.
- When in doubt, prefer the *narrower* change over a refactor.

---

## 4. What not to do

❌ **Don't**

- ❌ Introduce `any`. Define DTOs or use Prisma types.
- ❌ Import server-only modules (`prisma`, `nodemailer`, `aws-sdk`) into client components.
- ❌ Catch errors silently. Always log and return a user-safe message.
- ❌ Add new environment variables without documenting them in [docs/environment.md](./docs/environment.md).
- ❌ Add new third-party SDKs without checking if existing ones (axios, native `fetch`, `@aws-sdk/client-s3`, `nodemailer`) cover the need.
- ❌ Hard-code secrets, API keys, or URLs. Use `process.env.*` via `lib/config/*` where possible.
- ❌ Use `--no-verify` on commits, `--force` on push, or `prisma migrate reset` against a non-local DB.
- ❌ Push to `master` directly. Always work on a feature branch and open a PR.
- ❌ Commit `.env*` files.
- ❌ Run `prisma migrate reset` or `db push --force-reset` outside local dev.
- ❌ Touch `prisma/migrations/` history (rename, edit, or delete past migrations).
- ❌ Remove or "modernise" the existing `lib/services/` ↔ `utils/service/` split — the names are similar, the purposes differ. Read [docs/coding-standards.md §6](./docs/coding-standards.md).
- ❌ Add a third payment gateway, third image provider, or duplicate hook layer without an explicit ADR-style discussion in the PR.
- ❌ Skip auth checks "because middleware will catch it" — middleware does **not** run on `/api/**`.
- ❌ Modify the booking webhook handler without testing both Midtrans success and cancel paths manually.

---

## 5. Risk tiers — when to ask first

The agent should **stop and confirm** before:

| Action | Why |
|---|---|
| Schema migrations on shared/production DB | irreversible data shape change |
| `prisma migrate reset` | wipes data |
| Force-push, branch deletion, history rewrites | lost work |
| Removing or rotating an env var that production depends on | outages |
| Sending real emails (live SMTP) from a local script | spams real users |
| Calling Midtrans / Viator with **production** keys from a local script | charges real money |
| Renaming or moving files referenced by `prisma/migrations/` or many imports | breakage |
| Editing `prisma/schema.prisma` enums (especially `BookingStatus`, `UserRole`) | data semantics |
| Touching `app/api/payment/notification/route.ts` | money path |
| Changing `utils/common/auth.ts` callbacks | login can break silently |

For routine local edits the agent proceeds without asking.

---

## 6. Definition of Done

A task is done when:

1. **Code change matches the request** — no scope creep, no surprise refactors.
2. **No new `any`** introduced.
3. **`npm run lint`** passes.
4. **`npm run build`** passes (or is documented as failing for unrelated reasons).
5. **Schema changes** have a committed migration in `prisma/migrations/`.
6. **New env vars** are added to [docs/environment.md](./docs/environment.md).
7. **New API endpoints** follow [docs/api-patterns.md](./docs/api-patterns.md) (auth, status codes, error shape).
8. **UI changes** were exercised in a browser via `npm run dev` (or explicitly noted as not visually testable).
9. **Booking / payment / auth changes** have a manual QA note in the PR description (until tests exist — see [docs/testing-strategy.md §9](./docs/testing-strategy.md)).
10. **No `console.log` left** behind. `console.error` only for genuine errors.
11. **Spec file under [test-user/](./test-user/) updated** — add the new test case, append the route to the matching surface-area table, and bump `updatedAt`. New Prisma model? Append to [test-user/13-local-checklist.md](./test-user/13-local-checklist.md). New external dependency? Append to [test-user/12-third-party-checklist.md](./test-user/12-third-party-checklist.md).

---

## 7. Commit & PR conventions

- Commit subject: present-tense imperative, ≤ 72 chars. e.g. `add transaction to destination create`.
- One logical change per commit where reasonable.
- PRs against `master`. Default reviewer: repo owner.
- PR body must include: **Summary**, **Why**, **Test plan**, and call out any schema or env changes.
- Never `git commit --no-verify` or `--amend` an already-pushed commit without explicit approval.

---

## 8. When the agent is uncertain

In order of preference:

1. **Read the code** — `Read` on the relevant file is cheap.
2. **Read the docs** — `docs/*` is the contract.
3. **Search** — `grep` for similar patterns; copy them.
4. **Ask** — when behaviour is ambiguous or when reversing a decision in [docs/tech-debt.md §15 (Decision log)](./docs/tech-debt.md).

Don't guess at infrastructure: if a behaviour depends on Vercel cron, S3 bucket policy, or Midtrans dashboard config, ask the human.

---

## 9. Non-negotiables (security)

- Webhook handlers verify signatures **server-side**. Never trust client-confirmed payment.
- All passwords go through `bcryptjs`. Never store plaintext.
- Never log secrets, snap tokens, payment IDs, or PII.
- Never disable Cloudflare Turnstile in production paths.
- Never widen a route's auth check (e.g. drop role gate) without explicit instruction.
- Never expose `error.stack` or raw Prisma errors to API responses.

---

## 10. Style of communication (for the agent)

- Brief. Skip pleasantries.
- State what you're about to do in one sentence before tool calls.
- After each change, summarise what changed and what's next — one or two sentences.
- Use markdown links for files: `[file](path/to/file.ts:42)` so users can click through.
- Don't celebrate. Don't apologise. Don't claim "production ready" — say "implemented; needs manual QA".
