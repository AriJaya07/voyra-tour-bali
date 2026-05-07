# Deployment — Voyra Tour Bali

> Self-hosted PostgreSQL on Contabo VPS + Next.js on Vercel. Pairs with the canonical [environment.md](../docs/environment.md).

---

## 1. Goal

Migrate the Prisma database from the previous Prisma Cloud / Neon-style provider to a **self-managed PostgreSQL 16** instance running on a Contabo Cloud VPS, while keeping the Next.js app on Vercel.

Why self-host:
- Cost predictability (flat VPS price vs. metered DB).
- Full control over Postgres version, extensions, backups.
- Same VPS already runs the Japanese sister project — re-use the host.

---

## 2. Topology

```
                ┌────────────────────────┐
                │  Vercel  (Next.js 16)  │
                │  - app/api/**          │
                │  - cron daily          │
                └────────────┬───────────┘
                             │  HTTPS  (sslmode=require)
                             │  port 5432
                             ▼
            ┌────────────────────────────────────┐
            │  Contabo Cloud VPS 20 NVMe         │
            │  62.171.156.55                     │
            │  db.balitravelnow.com              │
            │  Ubuntu 24.04 LTS                  │
            │  ┌──────────────────────────────┐  │
            │  │  PostgreSQL 16               │  │
            │  │  ├─ voyra_bali  (this app)   │  │
            │  │  └─ japanese_db (sister app) │  │
            │  └──────────────────────────────┘  │
            └────────────────────────────────────┘
```

---

## 3. File index — read in order

| Doc | When |
|---|---|
| [01-contabo-postgres-setup.md](./01-contabo-postgres-setup.md) | First-time DB provisioning on the VPS |
| [02-env-vars-reference.md](./02-env-vars-reference.md) | Before editing `.env*` or Vercel env vars |
| [03-vercel-deployment.md](./03-vercel-deployment.md) | Deploying / re-deploying to Vercel |
| [04-prisma-migration-flow.md](./04-prisma-migration-flow.md) | Schema changes after the DB is live |
| [05-operations-runbook.md](./05-operations-runbook.md) | Day-2: backups, rotation, monitoring, incidents |

---

## 4. Pre-flight checklist (one-time)

- [ ] SSH access to `deploy@db.balitravelnow.com` confirmed
- [ ] DNS `db.balitravelnow.com` → `62.171.156.55` resolves (`dig db.balitravelnow.com +short`)
- [ ] Vercel project linked locally (`vercel link`)
- [ ] Local `psql` client installed (`brew install libpq` on macOS)
- [ ] Password manager ready to store generated secrets
- [ ] `openssl rand -hex 24` produces a 48-char string (sanity check)

---

## 5. State of the migration (as of 2026-05-07)

| Step | Status | Notes |
|---|---|---|
| Postgres 16 installed on VPS | ✅ | `psql --version` returns 16.13 |
| Database `voyra_bali` created | ✅ | Owner: `voyra_admin` |
| Two-user pattern (`voyra_admin` + `voyra_app`) | ✅ | Default privileges set |
| Hex passwords (URL-safe) | ✅ | Stored in password manager only |
| Remote access (`listen_addresses='*'` + hostssl) | ✅ | `pg_hba.conf` requires SSL |
| Firewall (`ufw allow 5432/tcp`) | ✅ | **Open to 0.0.0.0 — restrict later** |
| Local Mac → VPS connection verified | ✅ | Both users tested |
| Local `.env`, `.env.local`, `.env.development` updated | ✅ | Old Prisma Cloud URLs commented |
| `prisma/schema.prisma` `directUrl` added | ✅ | Datasource now uses both URLs |
| `prisma generate` | ✅ | Client v6.19.2 |
| `prisma migrate deploy` (37 migrations) | ✅ | Idempotency fix applied — see [04-prisma-migration-flow.md](./04-prisma-migration-flow.md) |
| `prisma db seed` | ✅ | `admin@travel.com` / `admin123` |
| Vercel env vars updated | ⏳ pending | See [03-vercel-deployment.md](./03-vercel-deployment.md) |
| Vercel redeploy | ⏳ pending | After env vars |
| Production smoke test | ⏳ pending | After redeploy |
| Password rotation (post-leak) | ⏳ todo | Passwords were pasted in chat during setup |
| `ufw` IP allow-list (replace 0.0.0.0/0) | ⏳ todo | Restrict to Vercel egress + dev IP |
| Let's Encrypt SSL cert | ⏳ todo | Currently using Postgres self-signed |
| Nightly `pg_dump` cron | ⏳ todo | See [05-operations-runbook.md](./05-operations-runbook.md) |

---

## 6. Quick reference — what consumes each var

| Env var | Consumer | Set in `.env` (local)? | Set in Vercel? |
|---|---|---|---|
| `DATABASE_URL` | Prisma runtime client (app) — points to **`voyra_app`** | ✅ | ✅ All envs |
| `DIRECT_URL` | Prisma migrate / introspect — points to **`voyra_admin`** | ✅ | ✅ Production only (build-time `prisma generate`) |
| `POSTGRES_URL` | _legacy from Prisma Cloud — unused in code_ | 🗑 remove | 🗑 remove |
| `PRISMA_DATABASE_URL` | _legacy from Prisma Cloud — unused in code_ | 🗑 remove | 🗑 remove |

The audit was performed by `grep -rE "DATABASE_URL\|DIRECT_URL\|POSTGRES_URL\|PRISMA_DATABASE_URL"` across `app/`, `lib/`, `utils/`, `components/`, `prisma/`. Only `prisma/schema.prisma` references the DB URLs. See [02-env-vars-reference.md](./02-env-vars-reference.md) for the full audit table.

---

## 7. Non-goals

- This guide does **not** cover migrating the **Japanese** sister DB (already running, untouched).
- This guide does **not** cover read-replica or HA setup (single primary is acceptable for current traffic).
- This guide does **not** cover Cloudflare in front of Vercel (separate concern).
