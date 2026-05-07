# Vercel Deployment — Voyra Tour Bali

> Deploying the Next.js 16 app to Vercel against the Contabo Postgres backend.

---

## 1. One-time link

```bash
cd voyra-tour-bali
npx vercel link              # link the local repo to its Vercel project
npx vercel env pull .env.local   # optional: sync env back from Vercel
```

> Don't run `vercel env pull` blindly after editing `.env.local` locally — it overwrites. Only pull when re-syncing.

---

## 2. Environment variables — the canonical set

For each variable, set the scope (Production / Preview / Development) explicitly. Do **not** rely on "All Environments" for secrets that should differ.

### 2.1 Database (this migration)

| Var | Value | Production | Preview | Development |
|---|---|---|---|---|
| `DATABASE_URL` | `postgresql://voyra_app:<APP_HEX>@db.balitravelnow.com:5432/voyra_bali?sslmode=require` | ✅ | ✅ | ✅ |
| `DIRECT_URL` | `postgresql://voyra_admin:<ADMIN_HEX>@db.balitravelnow.com:5432/voyra_bali?sslmode=require` | ✅ | ❌ | ✅ |
| `POSTGRES_URL` | _legacy_ | 🗑 delete | 🗑 delete | 🗑 delete |
| `PRISMA_DATABASE_URL` | _legacy_ | 🗑 delete | 🗑 delete | 🗑 delete |

See [02-env-vars-reference.md](./02-env-vars-reference.md) for *why* this split.

### 2.2 Other vars — full list (already in Vercel; verify after the DB swap)

Cross-reference [environment.md §3](../docs/environment.md#3-variables--full-reference). The DB swap should not change any of these:

- **NextAuth:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- **Turnstile:** `NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY`, `CF_TURNSTILE_SECRET_KEY`
- **AWS S3:** `AWS_REGION`, `AWS_STORAGE_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- **Midtrans:** `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION`, `MIDTRANS_SNAP_URL`
- **Viator:** `VIATOR_API_KEY`, `VIATOR_API_URL`, `NEXT_PUBLIC_VIATOR_MOCK_BOOKING`
- **TourCMS:** all `TOURCMS_*`
- **SMTP/Brevo:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **AI:** `GROQ_API_KEY`
- **Web Push:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- **Cron:** `CRON_SECRET`
- **SEO/Analytics:** `GOOGLE_SITE_VERIFICATION`, `GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_ID`
- **Misc:** `NEXT_PUBLIC_WA_NUMBER`, `BALI_NEWS_API`

### 2.3 How to set in CLI (faster than dashboard)

```bash
# Add a single var to Production only
vercel env add DATABASE_URL production
# pasted value, ctrl-D

# Remove a stale var from all envs
vercel env rm POSTGRES_URL production
vercel env rm POSTGRES_URL preview
vercel env rm POSTGRES_URL development
```

---

## 3. Build configuration

The repo's `package.json` already does the right things. Verify:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "next build"
  }
}
```

| Phase | Vercel runs | DB connection? |
|---|---|---|
| `npm install` | `postinstall` → `prisma generate` | ❌ generate is offline |
| `npm run build` | `next build` | ❌ build is offline (no SSG against the DB unless you add it explicitly) |
| Runtime | Each lambda invocation | ✅ via `DATABASE_URL` |

> If a route uses `force-dynamic`, no SSG occurs. If a route adds `generateStaticParams` that calls Prisma, build will hit the DB and `DATABASE_URL` must be valid in the build env. Audit before enabling SSG against the live DB.

---

## 4. (Optional) Run migrations on every deploy

**Default: do not run migrations from Vercel.** Run them from a developer machine via `npx prisma migrate deploy` against `DIRECT_URL`. This avoids rolling deploys racing schema changes.

If you ever want auto-migrate on Production deploys:

```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build"
  }
}
```

Caveats — read all before enabling:

- Vercel rolls deploys: a deploy that mutates schema before old pods drain may break the old pods serving traffic.
- A failing migration **fails the deploy**, blocking unrelated changes.
- Vercel's build env must include `DIRECT_URL` (Production only).
- Destructive migrations (column drops) need a [two-step deploy](https://www.prisma.io/docs/orm/prisma-migrate/workflows/team-development#deploying-database-changes).

If unsure, leave the manual flow.

---

## 5. Cron jobs

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/daily-dispatcher", "schedule": "0 1 * * *" }
  ]
}
```

This route fans out to every other cron worker. It expects `Authorization: Bearer ${CRON_SECRET}`. Vercel adds this header automatically when invoking its own crons (via the project's `CRON_SECRET` env). Do **not** rotate `CRON_SECRET` without redeploying.

Other cron-style routes (called by `daily-dispatcher`, not by Vercel directly):

- `/api/cron/ai-welcome-followup`
- `/api/cron/ai-subscription-renewals`
- `/api/cron/ai-expire-credits`
- `/api/cron/ai-renewal-reminders`
- `/api/cron/ai-grace-sweep`
- `/api/cron/calendar-event-reminders`

These all connect to the DB via `prisma` (= `DATABASE_URL` = `voyra_app`). After the DB swap, smoke-test by hitting the dispatcher manually post-deploy:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://www.balitravelnow.com/api/cron/daily-dispatcher
```

---

## 6. Deployment sequence (DB-swap day)

Order matters. A naive deploy where Vercel still has the old DB URL while local is on the new DB will leave traffic split-brained.

1. **Confirm the new DB is fully migrated and seeded** (see [04-prisma-migration-flow.md](./04-prisma-migration-flow.md)).
2. **Add new env vars to Vercel** (`DATABASE_URL` + `DIRECT_URL` for the Contabo URLs).
3. **Delete legacy env vars** from Vercel (`POSTGRES_URL`, `PRISMA_DATABASE_URL`).
4. **Trigger a redeploy** — env changes do **not** auto-redeploy. Either:
   - Push an empty commit: `git commit --allow-empty -m "chore: redeploy with Contabo DB" && git push`
   - Or in dashboard → Deployments → Redeploy latest.
5. **Watch the build log** for "Generated Prisma Client".
6. **Smoke test** as soon as the deploy is live (see §7).
7. **Keep the old DB live for 24–48h** as a rollback target. If a critical bug surfaces, swap env vars back and redeploy.

---

## 7. Post-deploy smoke test (Production)

| Check | How |
|---|---|
| Homepage renders | `curl -I https://www.balitravelnow.com` → 200 |
| Auth works | Sign in with Google or `admin@travel.com` / `admin123` |
| Booking list reads from DB | `/profile` shows existing bookings (or "no bookings" cleanly) |
| Write path works | Create a wishlist item; verify in `psql` via `voyra_admin` |
| Cron dispatcher | `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/daily-dispatcher` returns 200 |
| Logs | Vercel → Logs: filter `error` for the first 30 min — expected baseline only |
| Postgres logs | `sudo journalctl -u postgresql -n 100` — look for unexpected `FATAL` |

If any check fails, see [05-operations-runbook.md §6](./05-operations-runbook.md#6-troubleshooting).

---

## 8. Rollback plan

If smoke test fails and the cause is the new DB:

1. In Vercel, swap `DATABASE_URL` and `DIRECT_URL` back to the old (Prisma Cloud) values — keep them noted **before** the migration starts. (They are commented out in `.env` and `.env.local` for exactly this reason.)
2. Redeploy.
3. Investigate on Contabo without time pressure.

> ⚠️ Rollback after **writes** have happened on the new DB requires a manual data backfill or a `pg_dump` import to the old DB. Only safe rollback window is the first ~30 min if traffic is low.

---

## 9. Production-readiness gate

Do not call the migration "done" until **all** of:

- [ ] Smoke test §7 fully green
- [ ] Vercel Logs clean for 1 hour
- [ ] At least one real user transaction completes end-to-end (booking + payment if you can stage one)
- [ ] Nightly `pg_dump` succeeded once (see [05-operations-runbook.md §1](./05-operations-runbook.md))
- [ ] Passwords rotated post-setup (see [05-operations-runbook.md §3](./05-operations-runbook.md))
