# Operations Runbook — Contabo PostgreSQL

> Day-2 operations: backup, restore, password rotation, monitoring, troubleshooting. Read on incident.

---

## 1. Backups (must do before going live)

### 1.1 Why on-VPS

The Contabo VPS provides snapshots at the host level, but those are coarse (per-day, full-VM). A logical `pg_dump` is faster to restore one DB and survives bad migrations.

### 1.2 Nightly `pg_dump` cron

On the VPS:

```bash
sudo mkdir -p /var/backups/postgres
sudo chown postgres:postgres /var/backups/postgres
sudo -u postgres crontab -e
```

Add:

```cron
# Daily 02:15 — dump voyra_bali, keep 14 days
15 2 * * * pg_dump -Fc -d voyra_bali -f /var/backups/postgres/voyra_bali_$(date +\%F).dump 2>>/var/log/postgresql/backup.err && find /var/backups/postgres -name "voyra_bali_*.dump" -mtime +14 -delete
```

`-Fc` = custom format (compressed, restorable with `pg_restore`).

### 1.3 Off-VPS copy (recommended)

A backup that lives only on the box that holds the live DB is not really a backup. Sync to S3:

```bash
sudo apt install -y awscli
aws configure   # use a dedicated IAM user with write to a backup bucket
```

Append to the cron:

```cron
20 2 * * * aws s3 sync /var/backups/postgres s3://voyra-db-backups/ --storage-class STANDARD_IA
```

> Use a **separate** IAM key from the app's `AWS_ACCESS_KEY_ID`. Backups must survive a credential leak in the app.

### 1.4 Test the restore — once

Untested backups don't count.

```bash
# On the VPS, into a scratch DB:
sudo -u postgres createdb voyra_bali_restore_test
sudo -u postgres pg_restore -d voyra_bali_restore_test /var/backups/postgres/voyra_bali_<date>.dump
sudo -u postgres psql -d voyra_bali_restore_test -c "SELECT COUNT(*) FROM \"User\";"
sudo -u postgres dropdb voyra_bali_restore_test
```

Document the date of the last restore drill in this file.

> **Last restore drill:** _none yet._

---

## 2. Restore procedure (incident)

```bash
# 1. Stop writes — pause Vercel deployments OR put the app in maintenance
#    (Vercel does not have a maintenance flag; do this by deploying a static
#    "down for maintenance" page from a separate branch).

# 2. Rename the broken DB so you can investigate later
sudo -u postgres psql -c 'ALTER DATABASE voyra_bali RENAME TO voyra_bali_broken;'

# 3. Recreate empty
sudo -u postgres psql -c 'CREATE DATABASE voyra_bali OWNER voyra_admin;'

# 4. Re-apply role grants from 01-contabo-postgres-setup.md §2.3

# 5. Restore from the most recent dump
sudo -u postgres pg_restore -d voyra_bali /var/backups/postgres/voyra_bali_<date>.dump

# 6. Spot-check
sudo -u postgres psql -d voyra_bali -c 'SELECT MAX("createdAt") FROM "Booking";'

# 7. Resume traffic — Vercel redeploy
```

Acceptable RTO: ≤ 30 min for a 2 GB DB. Test once a quarter.

---

## 3. Password rotation

Trigger any of:

- Password leaked (chat, screenshot, accidental commit)
- Quarterly hygiene
- Personnel change

### Procedure

```bash
# 1. Generate new on local Mac
openssl rand -hex 24       # admin
openssl rand -hex 24       # app

# 2. Update on the VPS
ssh deploy@db.balitravelnow.com
sudo -u postgres psql
```

```sql
ALTER USER voyra_admin WITH PASSWORD '<NEW_ADMIN_HEX>';
ALTER USER voyra_app   WITH PASSWORD '<NEW_APP_HEX>';
\q
```

```bash
# 3. Update env in this order — DON'T reverse, or runtime breaks before redeploy
#    a) Vercel dashboard: DATABASE_URL + DIRECT_URL with new values
#    b) Your local .env, .env.local, .env.development
#    c) Trigger Vercel redeploy
git commit --allow-empty -m "chore: rotate db creds" && git push

# 4. Invalidate any teammate's local copies
#    Tell them to vercel env pull or copy the new values
```

### Verification

```bash
# Old creds should no longer work
PGPASSWORD='<OLD>' psql "host=db.balitravelnow.com user=voyra_app sslmode=require dbname=voyra_bali" -c "select 1;" 2>&1 | grep authentication
# → password authentication failed

# New creds should work
PGPASSWORD='<NEW>' psql "host=db.balitravelnow.com user=voyra_app sslmode=require dbname=voyra_bali" -c "select 1;"
# → returns ?column? = 1
```

> **Outstanding rotation TODO** — passwords were pasted into chat during the initial setup on 2026-05-07. Rotate before declaring the migration "complete". See [README.md §5](./README.md#5-state-of-the-migration-as-of-2026-05-07).

---

## 4. Monitoring (lightweight)

We do not run Datadog / Grafana yet. Minimal monitoring:

### 4.1 Postgres logs

```bash
sudo journalctl -u postgresql -f                     # live tail
sudo tail -f /var/log/postgresql/postgresql-16-main.log  # full log
```

Alert-worthy patterns:
- `FATAL: password authentication failed` (high frequency = attack or stale creds)
- `FATAL: too many connections` (need pool review)
- `ERROR: deadlock detected` (transaction logic problem)
- `WARNING: terminating connection because of crash of another server process` (Postgres bug — rare)

### 4.2 Disk

```bash
df -h /var/lib/postgresql
du -sh /var/lib/postgresql/16/main
```

Alert at 70% full. The Cloud VPS 20 NVMe gives ~400 GB; current footprint is small.

### 4.3 Connections

```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
SELECT pid, usename, application_name, client_addr, state, query
  FROM pg_stat_activity
  WHERE state != 'idle';
```

Vercel's serverless pattern means short, bursty connections. If you see > 50 idle connections from `voyra_app`, Prisma Client may be misbehaving across lambda warmups — investigate `lib/prisma.ts`.

### 4.4 Slow queries

Enable `pg_stat_statements` once when you have time:

```sql
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
-- restart Postgres
CREATE EXTENSION pg_stat_statements;

-- top 10 slowest by total time
SELECT mean_exec_time, calls, query
  FROM pg_stat_statements
  ORDER BY total_exec_time DESC
  LIMIT 10;
```

---

## 5. Common operations

### 5.1 Connect from local to inspect

```bash
PGPASSWORD='<ADMIN_HEX>' psql \
  "host=db.balitravelnow.com port=5432 dbname=voyra_bali user=voyra_admin sslmode=require"
```

### 5.2 Quickly count rows in a table

```sql
SELECT COUNT(*) FROM "Booking";
SELECT COUNT(*) FROM "User";
```

### 5.3 Open `prisma studio` against prod (read-only intent)

```bash
npx prisma studio
```

Connects via `DATABASE_URL` = `voyra_app`. The app role can write — be careful. For pure read-only browsing, create a third `voyra_readonly` role:

```sql
CREATE ROLE voyra_readonly LOGIN PASSWORD '<HEX>';
GRANT CONNECT ON DATABASE voyra_bali TO voyra_readonly;
GRANT USAGE ON SCHEMA public TO voyra_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO voyra_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE voyra_admin IN SCHEMA public
  GRANT SELECT ON TABLES TO voyra_readonly;
```

### 5.4 Pause Vercel briefly

There is no "pause" toggle — disable a deployment by promoting an older one or rolling back via Vercel dashboard → Deployments → Promote to Production.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Vercel build fails: `Environment variable not found: DATABASE_URL` | Var missing in selected env | Re-add via dashboard, redeploy |
| Vercel runtime: `Can't reach database server at db.balitravelnow.com:5432` | VPS down / `ufw` block / DNS flap | `systemctl status postgresql`; `ufw status`; `dig db.balitravelnow.com` |
| Vercel runtime: `password authentication failed for user "voyra_app"` | Old password in env / typo | Re-paste from password manager; redeploy |
| Local `prisma migrate dev` hangs | Likely `pg_hba.conf` rule mismatch | `sudo journalctl -u postgresql -n 50` for the rejection reason |
| `prisma migrate deploy` errors P3018 | Migration partially applied (broken SQL) | See [04-prisma-migration-flow.md §3.3](./04-prisma-migration-flow.md#33-the-recovery-procedure-if-you-ever-bootstrap-another-fresh-db) |
| `psql: connection refused` from local | `listen_addresses` wrong / Postgres restart didn't pick up config | `sudo systemctl restart postgresql`; `sudo -u postgres psql -c "SHOW listen_addresses;"` should print `*` |
| `psql: SSL error: certificate verify failed` | Using `sslmode=verify-full` against self-signed cert | Either install Let's Encrypt (preferred) or use `sslmode=require` |
| Suddenly slow queries | Index missing / autovacuum lag | `EXPLAIN ANALYZE`; check `pg_stat_user_indexes.idx_scan` |
| Disk near full | Old WAL / log files | `find /var/log/postgresql -mtime +14 -delete`; check `pg_wal/` size; consider lowering `max_wal_size` |

---

## 7. Hardening backlog (do in order)

1. **Rotate passwords** (post-leak from setup chat). See §3.
2. **Restrict `ufw` to known IPs** instead of `0.0.0.0/0`.
   ```bash
   sudo ufw delete allow 5432/tcp
   sudo ufw allow from <your-ip>/32 to any port 5432 proto tcp
   ```
   Vercel doesn't publish stable egress IPs; either accept `0.0.0.0/0` + strong creds, or front the DB with a reverse-tunnel (Cloudflare Tunnel / Tailscale).
3. **Let's Encrypt SSL cert** with auto-renew. See [01-contabo-postgres-setup.md §5](./01-contabo-postgres-setup.md#5-ssl-certificate).
4. **Off-VPS backups** to S3 with separate IAM. See §1.3.
5. **`pg_stat_statements` extension** for slow-query visibility. See §4.4.
6. **Read-only role** (`voyra_readonly`) for analytics / Studio browsing. See §5.3.
7. **Per-env DBs** — currently all environments share `voyra_bali`. Consider `voyra_bali_dev` once a teammate joins.
8. **Logging level** — set `log_statement = 'ddl'` to keep an audit trail of every schema change.
9. **fail2ban** for `psql` brute-force attempts on the VPS.
10. **Connection pooler** (PgBouncer) if Vercel lambdas exhaust `max_connections` (default 100). Symptom: "too many connections" errors. Until then, `lib/prisma.ts`'s singleton handles it.

---

## 8. Contact / escalation

| What broke | Who | How |
|---|---|---|
| Postgres on VPS | Repo owner (you) | SSH `deploy@db.balitravelnow.com` |
| Vercel build / runtime | Repo owner | Vercel dashboard, project logs |
| DNS for `db.balitravelnow.com` | Domain registrar | Wherever the zone for `balitravelnow.com` lives |
| Contabo VPS hardware / network | Contabo support | https://contabo.com/en/support/ |
