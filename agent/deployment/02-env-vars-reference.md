# Env Vars Reference (Database) — Voyra Tour Bali

> Database-specific subset of [environment.md](../docs/environment.md). Documents **which env var goes where**, **why each exists**, and **how Prisma actually consumes them**. The full audit is in §3.

---

## 1. The two variables that matter

### `DATABASE_URL`

- **Consumer:** Prisma Client (runtime).
- **Role:** App (`voyra_app`) — DML only.
- **Why low-priv:** A leaked Vercel env or a SSRF leak into the Next.js app must not be able to drop tables. Strict separation of "what runs queries" vs. "what changes schema".
- **Format:** `postgresql://voyra_app:<APP_HEX>@db.balitravelnow.com:5432/voyra_bali?sslmode=require`

### `DIRECT_URL`

- **Consumer:** Prisma CLI (`migrate`, `db push`, `db pull`, `db seed`, `studio`). At runtime the Prisma Client **ignores** this variable.
- **Role:** Admin (`voyra_admin`) — DDL + DML.
- **Why separate:** Two reasons.
  1. **Privilege:** migrations create tables, drop columns, change indexes — they need the owner role.
  2. **Connection routing (future):** if you ever introduce a connection pooler (PgBouncer, Supabase pooler, AWS RDS Proxy) in front of `DATABASE_URL`, migrations require a *direct* unpooled connection to issue prepared-statement-heavy DDL. Prisma's `directUrl` exists for exactly this. Today we have no pooler, but adding `directUrl` now means we don't have to refactor later.
- **Format:** `postgresql://voyra_admin:<ADMIN_HEX>@db.balitravelnow.com:5432/voyra_bali?sslmode=require`

### How Prisma maps them to clients

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // PrismaClient at runtime
  directUrl = env("DIRECT_URL")     // CLI: migrate/seed/studio/db-push
}
```

| Command | Reads | Effective user |
|---|---|---|
| `next dev` / Vercel runtime | `DATABASE_URL` | `voyra_app` |
| `npx prisma generate` | _no DB connection_ | n/a |
| `npx prisma migrate deploy` | `DIRECT_URL` (or falls back to `DATABASE_URL`) | `voyra_admin` |
| `npx prisma migrate dev` | `DIRECT_URL` | `voyra_admin` |
| `npx prisma db seed` | `DATABASE_URL` (the seed script imports `PrismaClient`) | ⚠️ see §4 |
| `npx prisma studio` | `DATABASE_URL` | `voyra_app` (read-only browsing OK) |

> ⚠️ **Seed quirk** — see §4. Seed runs as the runtime user and may need temporary admin elevation depending on the script.

---

## 2. Variables we do **not** use (audited)

| Var | Reason | Action |
|---|---|---|
| `POSTGRES_URL` | Auto-injected by older Vercel/Prisma Cloud integration. **Zero references** in `app/`, `lib/`, `utils/`, `components/`, `prisma/`. | 🗑 Remove from `.env*` and Vercel |
| `PRISMA_DATABASE_URL` | Same as above. | 🗑 Remove |
| `POSTGRES_PRISMA_URL` | Sometimes set by Vercel's Postgres integration. **Not present** in this repo's env files at audit time. | Do not add |
| `POSTGRES_URL_NON_POOLING` | Vercel Postgres pooled-vs-direct convention. We use `DIRECT_URL` instead. | Do not add |

**Audit method.** Run from repo root:

```bash
grep -rE "DATABASE_URL|DIRECT_URL|POSTGRES_URL|PRISMA_DATABASE_URL" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" \
  --include="*.prisma" --include="*.json" \
  | grep -v node_modules | grep -v ".next"
```

Expected hits **only**:
- `prisma/schema.prisma:7` — `url       = env("DATABASE_URL")`
- `prisma/schema.prisma:8` — `directUrl = env("DIRECT_URL")`

Anything else is a regression. Re-run this audit on every PR that touches DB infra.

---

## 3. Where each env file lives & what it should contain

| File | Env scope | Tracked in git? | Should contain DB vars? |
|---|---|---|---|
| `.env` | Prisma CLI fallback (when `next` is not running). Read by `prisma migrate`, `prisma db seed`, `prisma studio`. | ❌ ignored | ✅ Yes — both `DATABASE_URL` and `DIRECT_URL` |
| `.env.local` | `next dev` overrides everything. | ❌ ignored | ✅ Yes — usually identical to `.env` for solo dev |
| `.env.development` | `next dev` defaults (lower precedence than `.env.local`). | ❌ ignored | ✅ Yes — keep in sync; useful when collaborating |
| `.env.production` | Not used. Vercel injects production env. | n/a | ❌ Do not create |
| `.env.example` | Template committed to git. **Must contain placeholders, never real values.** | ✅ tracked | ✅ Yes, with `<REDACTED>` placeholders |

> **Order of precedence at runtime:** `process.env` (CI / Vercel) > `.env.local` > `.env.development` (when `NODE_ENV=development`) > `.env`. Prisma CLI uses the same order **except** it does not load `.env.local`. To be safe in CLI workflows, put canonical values in `.env`.

### Required content (all three: `.env`, `.env.local`, `.env.development`)

```ini
# Prod — Contabo VPS PostgreSQL
DATABASE_URL="postgresql://voyra_app:<APP_HEX>@db.balitravelnow.com:5432/voyra_bali?sslmode=require"
DIRECT_URL="postgresql://voyra_admin:<ADMIN_HEX>@db.balitravelnow.com:5432/voyra_bali?sslmode=require"
```

Old commented-out URLs from Prisma Cloud may stay as a rollback marker for one or two deploys, then deleted.

### `.env.example` template (commit-safe)

```ini
DATABASE_URL="postgresql://voyra_app:REDACTED@db.balitravelnow.com:5432/voyra_bali?sslmode=require"
DIRECT_URL="postgresql://voyra_admin:REDACTED@db.balitravelnow.com:5432/voyra_bali?sslmode=require"
```

---

## 4. Seed script gotcha

`prisma/seed.ts` does:

```ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

`PrismaClient` reads `DATABASE_URL` (= `voyra_app`). If a seed step needs DDL — creating an extension, calling a function — the app role will fail. Two options:

1. **Keep DML-only seeds** (preferred). The current seed only `upsert`s the admin user; this works under `voyra_app`.
2. **Run seed as admin** — pass `DATABASE_URL` ad-hoc:
   ```bash
   DATABASE_URL="$DIRECT_URL" npx prisma db seed
   ```
   Use only if a seed step demands it. Document the reason inline in the seed file.

---

## 5. Vercel env var matrix

| Var | Production | Preview | Development (vercel pull) |
|---|---|---|---|
| `DATABASE_URL` | ✅ app user | ✅ app user (same DB acceptable for now) | ✅ app user |
| `DIRECT_URL`   | ✅ admin user | ❌ omit (no migrations on previews) | ✅ admin user |
| `POSTGRES_URL` | 🗑 delete | 🗑 delete | 🗑 delete |
| `PRISMA_DATABASE_URL` | 🗑 delete | 🗑 delete | 🗑 delete |

> Why `DIRECT_URL` only in Production: the build step on Vercel runs `prisma generate` (no DB needed). It does **not** run `prisma migrate deploy` automatically — that's gated on a build script. If/when we add `prisma migrate deploy` to the build (see [03-vercel-deployment.md §4](./03-vercel-deployment.md)), `DIRECT_URL` becomes mandatory in Production.

> Why **not** Preview: preview deploys should never touch the production schema. If a future PR introduces destructive migrations, Preview running them would break Production. Either provision a separate preview DB or skip migrations on Preview entirely (current choice).

---

## 6. Code-level audit (where DB env actually flows)

```text
.env / Vercel env
        │
        ▼
prisma/schema.prisma
        │
        │  url       = env("DATABASE_URL")
        │  directUrl = env("DIRECT_URL")
        │
        ▼
@prisma/client (generated into node_modules)
        │
        ▼
lib/prisma.ts          ◀── single source of `PrismaClient`
        │
        ▼
app/api/**/route.ts    ◀── all data access
lib/services/**/*.ts
```

Files that import `prisma` (must all go through `@/lib/prisma`, never `new PrismaClient()`):

```bash
grep -rE "from ['\"]@/lib/prisma['\"]|new PrismaClient" \
  --include="*.ts" --include="*.tsx" \
  | grep -v node_modules
```

Expected: every match imports from `@/lib/prisma` **except** `lib/prisma.ts` itself, `prisma/seed.ts`, and one-off scripts under `prisma/_smoke-*.ts`. Any other `new PrismaClient()` is a bug — fix it.

---

## 7. Rotation hygiene

When passwords are rotated (see [05-operations-runbook.md §3](./05-operations-runbook.md)), update **all of**:

1. `.env`
2. `.env.local`
3. `.env.development`
4. Vercel `DATABASE_URL` (Production, Preview, Development)
5. Vercel `DIRECT_URL` (Production, Development)
6. Any local team member's `.env*`
7. Trigger a Vercel redeploy after env update — env changes do not auto-redeploy.

A grep tells you fast whether a stale value lingers:

```bash
grep -rl '<old-password-fragment>' . | grep -v node_modules
```

---

## 8. Growth/instrumentation vars (added 2026-07-08)

| Var | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLARITY_ID` | client | Microsoft Clarity project ID — session recordings/heatmaps. Script only loads when set. |
| `N8N_ERROR_WEBHOOK_URL` | server | n8n webhook receiving client/server error reports from `/api/monitoring/error`. Unset = silent no-op. |
| `N8N_ABANDONED_WEBHOOK_URL` | server | n8n webhook for abandoned-checkout recovery (`/api/cron/abandoned-checkout`). |
| `N8N_POSTTRIP_WEBHOOK_URL` | server | n8n webhook for post-trip review/referral emails (`/api/cron/post-trip`). |
| `N8N_WEBHOOK_TOKEN` | server | Shared secret sent as `x-webhook-token` header on all n8n webhook calls. Configure Header Auth on the n8n side. |
| `NEXT_PUBLIC_WA_NUMBER` | client | WhatsApp number (`62…` no plus) for the sticky CTA + booking widgets. Pre-existing var, now also used by `WhatsAppFloatButton`. |

See `docs/n8n-workflows.md` for the workflows these feed, and `lib/config/features.ts` for the feature-flag focus reset.
