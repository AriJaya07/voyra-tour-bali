# AI Prompt — Refactoring

> Use when asking an AI agent to **restructure existing code without changing behaviour**. Refactors must be observable as no-ops at the API and UI layer.

---

## 1. Universal refactor prompt

```text
Refactor the following code in Voyra Tour Bali.

Target: {{file or area}}
Goal: {{what should be different in the structure}}
Why: {{the pain — duplication, hard to test, unclear ownership, etc.}}

Constraints (non-negotiable):
- Behaviour-preserving. No change to:
  - Public API request/response shapes.
  - URL structure.
  - DB schema (no migration).
  - Persisted data.
  - User-visible UI text or layout.
- No mixing of refactor + feature change. If you spot a bug, file it; do not fix it here unless it blocks the refactor.
- Follow /docs/architecture.md, /docs/coding-standards.md, /docs/api-patterns.md, /docs/domain.md.
- Respect the decision log in /docs/tech-debt.md §15 — don't undo deliberate decisions.

Process:
1. Survey the touched code and its callers (grep before editing).
2. Plan: list files to change, in what order, with intent. Show me the plan before writing code if more than 5 files are involved.
3. Apply the refactor in small, reviewable steps.
4. After: `npm run lint`, `npm run build`. Walk through any UI affected.
5. Reply with: (a) files changed, (b) one-line description per file, (c) anything you intentionally skipped.

Definition of done in /agent-rules.md §6. Do NOT mark complete until lint + build pass.
```

---

## 2. Pre-flight checklist (the agent must do this)

- [ ] Identify all callers of the symbols being refactored. `grep -r` from the project root.
- [ ] Identify all routes / pages that exercise the touched code path.
- [ ] Identify any persisted data shape that depends on the touched code (Prisma queries, JSON columns, session shape).
- [ ] Plan the change as **smaller commits** when reasonable: extract → adapt callers → delete old.
- [ ] If a third-party SDK (Midtrans, Viator, S3, Nodemailer) call is being moved, ensure the env var read remains in the same boundary (server-only).

---

## 3. Targeted refactor templates

### 3.1 Extract a service from a route handler

Pattern: route handler grew too big. Move the orchestration into `lib/services/{{name}}Service.ts`.

```text
Extract the orchestration logic in `app/api/{{path}}/route.ts` into a server service.

Steps:
1. Create `lib/services/{{name}}Service.ts`.
2. Move pure logic (no req/res) into one or more exported functions.
3. The route handler keeps: auth check, body parse, validation, response shaping, error handling.
4. Service functions accept plain inputs (typed DTOs from `types/`) and return plain outputs.
5. Services use `prisma` from `@/lib/prisma`. Do NOT import `next/server` from services.
6. Update the route to call the service. Diff should be much shorter.

Verify:
- Same response shape (compare with curl before / after).
- Same status codes for the same inputs (200/201/400/401/404/500).
- Lint + build pass.
```

### 3.2 De-duplicate a hook + service pair

```text
The hook `utils/hooks/use{{X}}.ts` and service `utils/service/{{x}}.service.ts` are out of sync / duplicated with `use{{Y}}.ts`.

Steps:
1. Pick the canonical hook shape from /docs/coding-standards.md §5.
2. Move shared service calls into one entity service.
3. Each hook returns ONLY the queries + mutations relevant to its entity.
4. Cross-entity actions (e.g. delete destination → delete child contents) belong in a server service called by the API, not in two parallel hooks.
5. Update component imports.

Verify all admin pages still render and mutate correctly.
```

### 3.3 Wrap nested writes in a transaction

```text
Rewrite the nested write path in {{file}} to use `prisma.$transaction`.

Currently uses `Promise.all([prisma.x.update, ...])` after a top-level create. Replace with:

```ts
const destination = await prisma.$transaction(async (tx) => {
  const dest = await tx.destination.create({...});
  if (images?.length) {
    await Promise.all(images.map((img, i) =>
      tx.image.update({ where: { id: img.id }, data: { destinationId: dest.id, ...} })
    ));
  }
  // contents, locations, ...
  return tx.destination.findUnique({ where: { id: dest.id }, include: {...} });
});
```

Constraints:
- Use `tx` (the transaction client) inside, NOT the global `prisma`.
- Return the fully-populated entity to keep response shape identical.
- No behavioural change — same inputs produce same final DB state on success.
- On any error, the transaction rolls back. Verify the route's catch block still returns 500 with `{ error }`.

This pays down /docs/tech-debt.md §1.1.
```

### 3.4 Replace `any` with DTOs

```text
Replace `any` types in {{file}} with proper DTOs.

Steps:
1. For each `any`, look at the actual call sites and shape the data takes.
2. Define the DTO either:
   - Inline `interface XInput { ... }` if used in one place.
   - In `types/{{entity}}.ts` if shared across files.
3. For Prisma rows, prefer importing types from `@prisma/client`:
   ```ts
   import type { Booking, Prisma } from "@prisma/client";
   type BookingWithTravelers = Prisma.BookingGetPayload<{ include: { travelers: true } }>;
   ```
4. For request bodies that are user-supplied, narrow at the boundary; do not cast deep into the call stack.

Constraints:
- No runtime change — types only.
- Lint clean. Build clean.
- If a DTO would conflict with how callers pass data, fix the caller in the same PR; do not loosen the type.
```

### 3.5 Move a top-level shim into the canonical path

```text
The file {{lib/bookingService.ts | proxy.ts | other shim}} only re-exports from elsewhere. Migrate callers and delete the shim.

Steps:
1. `grep -r "from \"@/lib/bookingService\"" .` to find every caller.
2. Replace each with the canonical import.
3. Delete the shim file.
4. Run `npm run build` — TS will catch any miss.

If the shim is `proxy.ts` at the repo root, also update the Next.js middleware entry — Next looks for `middleware.ts` at the root. Keep the active middleware file there; remove the indirection.
```

### 3.6 Reorganise components folder

```text
Reorganise components in `components/{{area}}/` to follow the casing convention in /docs/coding-standards.md §2.

Constraints:
- Imports are case-sensitive on Linux (Vercel build) but case-insensitive on macOS. Use `git mv` to make renames visible to git.
- Update every importer in the same commit.
- Snapshot the file list before / after in your reply.
```

---

## 4. Refactor anti-patterns (DON'T do these)

❌ "Modernise" by introducing a new state library / form library / styling system.
❌ Rename `BookingStatus` enum values (data persists with old values).
❌ Change cascade rules in `schema.prisma` "to be cleaner" — it changes runtime behaviour.
❌ Convert services from `lib/services/` into hooks under `utils/hooks/` — different audiences, see [docs/coding-standards.md §6](../docs/coding-standards.md).
❌ Extract every helper into `utils/` — locality wins over DRY for things used once.
❌ Convert client components to server components without checking they don't use browser APIs.
❌ Bundle a refactor with a feature. Open two PRs.
❌ Run a sweeping codemod across the whole repo without showing the diff in a single review.

---

## 5. Reply format

```
## Refactor: {{title}}

### Goal
{{one line}}

### Files changed
- `lib/services/fooService.ts` — extracted from `app/api/foo/route.ts`
- `app/api/foo/route.ts` — slimmed to 30 lines; behaviour-preserving
- `utils/hooks/useFoo.ts` — no-op (verified)
- `types/foo.ts` — added `CreateFooDto`, `UpdateFooDto`

### Behaviour delta
None. Same status codes, same payloads. Verified via `curl` against local before/after.

### What I did NOT change
- The cascade rules on `Foo` (out of scope).
- The `any` in `bar.ts` (separate file, separate PR).

### Build & lint
✅ npm run lint
✅ npm run build

### Risk
Low. No callers of the deleted shim remain (`grep -r` clean).
```

---

## 6. Sequencing for risky refactors

For refactors that span >10 files or touch booking/payment/auth:

1. **Plan PR** — drop the plan as a comment on a tracking issue first. Get a 👍.
2. **Branch** — `refactor/<short-name>`.
3. **Commit per logical step** — extract, adapt callers in batches of ≤ 5 files, delete old.
4. **Self-review** — check the diff against this doc.
5. **Open PR** — link the plan; PR body shows the file list and behaviour-delta statement.
6. **Manual QA** — same checklist as the booking flow ([docs/testing-strategy.md §9](../docs/testing-strategy.md)).
7. **Merge** when CI is green and an approver signs off.

For a refactor that lands debt cleanup ([docs/tech-debt.md](../docs/tech-debt.md)), call out which item it pays down in the PR body. That's the only "victory lap" worth taking.
