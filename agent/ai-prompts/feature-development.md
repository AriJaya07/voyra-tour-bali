# AI Prompt — Feature Development

> Use this prompt template when asking an AI agent to **add a new feature** to the Voyra Tour Bali codebase. Paste the relevant section, fill in `{{...}}` placeholders, and run.

---

## 1. Pre-flight (always)

Before writing any feature, the agent must:

1. Read [docs/architecture.md](../docs/architecture.md) and [docs/coding-standards.md](../docs/coding-standards.md).
2. Read the most relevant of: [docs/api-patterns.md](../docs/api-patterns.md), [docs/domain.md](../docs/domain.md).
3. Skim [docs/tech-debt.md](../docs/tech-debt.md) — to avoid stepping on intentional patterns.
4. Acknowledge any schema changes need a Prisma migration.

---

## 2. Universal feature prompt (template)

```text
Add a new feature to the Voyra Tour Bali codebase: {{ONE-SENTENCE FEATURE DESCRIPTION}}.

Context:
- Stack: Next.js 16 App Router, React 19, TypeScript strict, Prisma + Postgres, NextAuth, TanStack Query, Tailwind v4, AWS S3, Midtrans, Viator.
- Read /docs/architecture.md, /docs/coding-standards.md, /docs/api-patterns.md, /docs/domain.md, /agent-rules.md before changing code.

User stories:
1. As a {{ROLE}}, I want {{CAPABILITY}}, so that {{OUTCOME}}.
2. ...

Acceptance criteria:
- [ ] {{TESTABLE BEHAVIOR 1}}
- [ ] {{TESTABLE BEHAVIOR 2}}
- [ ] Auth: {{public | authenticated | ADMIN-only}}
- [ ] Routes follow /docs/api-patterns.md (auth → parse → work → respond, error shape `{ error }`).
- [ ] Hooks follow the canonical React Query shape in /docs/coding-standards.md §5.
- [ ] No new `any`. Define DTOs in `types/` or co-located.
- [ ] No new env var without an entry in /docs/environment.md.
- [ ] Schema changes ship with a Prisma migration.

Out of scope:
- {{ANY EXPLICIT NON-GOALS}}

Plan first, then implement. Show me the file list and the data flow before writing code if the change touches more than 3 files.
```

---

## 3. Specialised templates

### 3.1 Add a new entity (full CRUD: schema → API → admin UI)

```text
Goal: introduce entity `{{Entity}}` with fields {{field: type, ...}}.

Steps (verify each before moving on):

1. Schema
   - Edit `prisma/schema.prisma` to add `model {{Entity}}` mirroring the conventions of `Category` / `Destination` (id Int autoincrement, slug String? @unique if applicable, createdAt/updatedAt).
   - Specify relations and `onDelete` rules consistent with /docs/domain.md.
   - Run `npx prisma migrate dev --name add_{{entity_snake}}`.
   - Commit the generated migration.

2. Server service (only if behaviour beyond raw CRUD)
   - Add `lib/services/{{entity}}Service.ts` for orchestration.

3. API
   - Add `app/api/{{entities}}/route.ts` (GET list, POST create).
   - Add `app/api/{{entities}}/[id]/route.ts` (GET, PUT, DELETE).
   - Follow the skeleton in /docs/api-patterns.md §2.
   - Auth: {{specify}}. If admin, gate with `role === "ADMIN"`.

4. Browser service
   - Add `utils/service/{{entity}}.service.ts` per /docs/coding-standards.md §6.1.

5. Hook
   - Add `utils/hooks/use{{Entities}}.ts` returning `{ data, isLoading, isError, create{{Entity}}, creating, update{{Entity}}, updating, delete{{Entity}}, deleting }`.

6. Admin UI
   - Add `app/dashboard/{{entities}}/page.tsx`.
   - Add `components/Dashboard/{{Entity}}Form.tsx` and `components/Dashboard/{{Entity}}Table.tsx`. Mirror existing forms (e.g. CategoryForm, LocationForm).

7. Sidebar link
   - Update `components/Dashboard/Sidebar.tsx` (or equivalent) to include the new admin page.

8. Verify
   - `npm run lint`
   - `npm run build`
   - Walk through create / list / update / delete in browser.

Definition of done in /agent-rules.md §6.
```

### 3.2 Add a new public page

```text
Goal: add public page at `/{{path}}` showing {{what}}.

- Use a Server Component by default (`app/{{path}}/page.tsx`).
- If data comes from the DB, query Prisma directly in the page (no `/api/*` round trip needed for read-only public surfaces).
- If data comes from a third party (Bali News API, Viator), use the existing client in `lib/`.
- Add SEO metadata via `lib/metadata.ts` and the `generateMetadata` export.
- Update `app/sitemap.ts` if the route should appear in the sitemap.
- Use Tailwind classes; rely on existing components in `components/Homepage/`, `components/Container/`, `components/Wrapper/`.
- Wrap in `<Container>` for layout consistency.
- No `"use client"` unless interactivity is required.
```

### 3.3 Add a new API endpoint

```text
Goal: add endpoint `{{METHOD}} /api/{{path}}` that {{description}}.

- Implement in `app/api/{{path}}/route.ts` per /docs/api-patterns.md §2.
- Auth: {{public | authenticated | ADMIN | webhook (signature) | cron (CRON_SECRET)}}.
- Validation: validate every required field; reject with 400 + `{ error: "<field> required" }`.
- Database: use `prisma` from `@/lib/prisma`. Wrap multi-step writes in `prisma.$transaction([...])`.
- Outbound calls: use `fetch` with `AbortSignal.timeout(...)`.
- Response: success returns the canonical shape from /docs/api-patterns.md §5; errors return `{ error }` + status.
- If this is a new mutation, update the matching React Query hook to invalidate the right query key.
- Document the endpoint in /docs/api-patterns.md §13 if it is a new pattern.
```

### 3.4 Add a new third-party integration

```text
Goal: integrate {{provider}} for {{purpose}}.

- Add config in `lib/config/{{provider}}.ts` reading from `process.env.*`.
- Add a thin client in `lib/api/{{provider}}-client.ts` (axios or `fetch`).
- Add the env vars to /docs/environment.md §3 and the template in §4.
- Wrap the integration in `lib/services/{{provider}}Service.ts` if non-trivial.
- Mock-mode flag: if the provider has a sandbox/mock equivalent (like Viator's `VIATOR_MOCK_BOOKING`), provide one.
- Never call the provider from a client component; always proxy through `app/api/{{provider}}/*`.
- Always set a request timeout.
- Add a section in /docs/architecture.md §9 listing the integration.
```

### 3.5 Add a new dashboard form

```text
Goal: add `components/Dashboard/{{Entity}}Form.tsx`.

- Mirror the structure of an existing form (e.g. CategoryForm or DestinationForm — note DestinationForm handles nested images/contents/locations and is the high-water mark).
- Form state with `useState` per field (this repo does not use react-hook-form).
- On submit, call the matching React Query mutation from `useEntities()`.
- Disable the submit button while `creating || updating`.
- Show success/error via `sonner` toasts (`toast.success`, `toast.error`).
- For image inputs, upload to S3 via `/api/images` first, then attach the returned image id to the entity payload — this is the established pattern in DestinationForm.
- Reset form on success.
```

---

## 4. Handoff format the agent should produce

When the agent finishes, it should respond with:

1. **Files changed** — bullet list with relative paths.
2. **Schema migrations created** — name + summary.
3. **New env vars** — name + purpose (or "none").
4. **API endpoints added** — METHOD + path + auth.
5. **Manual test plan** — checkboxes the user can run locally.
6. **Open questions** — anything assumed or unresolved.

---

## 5. Anti-prompts (don't do this)

❌ "Write a full booking platform feature with payment, refunds, multi-currency, and a mobile app."
- Too broad. Break into sub-features. Each sub-feature gets its own prompt.

❌ "Use react-hook-form / zustand / shadcn / styled-components."
- Stack is fixed. Don't introduce new state libs without an ADR-style discussion.

❌ "Refactor the auth system while you're there."
- Out of scope. File a separate task.

❌ "Skip the migration, just `db push`."
- Local-only shortcut. Production needs a migration file.
