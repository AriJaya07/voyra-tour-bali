# Contabo PostgreSQL Setup — Voyra Tour Bali

> One-time provisioning of PostgreSQL 16 on the Contabo Cloud VPS. Pairs with the [Japanese-project setup](https://example.internal) which uses the same VPS.

---

## 0. VPS facts

| Field | Value |
|---|---|
| Plan | Cloud VPS 20 NVMe |
| IPv4 | `62.171.156.55` |
| IPv6 | `2a02:c207:2328:4029::1` |
| Hostname (DNS) | `db.balitravelnow.com` |
| OS | Ubuntu 24.04 LTS |
| SSH user | `deploy@db.balitravelnow.com` |
| Postgres version | 16.13 |
| Postgres data dir | `/var/lib/postgresql/16/main` |
| Postgres config dir | `/etc/postgresql/16/main` |

> Confirm DNS before any work: `dig db.balitravelnow.com +short` should return `62.171.156.55`.

---

## 1. Install PostgreSQL (skip if already installed)

```bash
ssh deploy@db.balitravelnow.com
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
psql --version           # → psql (PostgreSQL) 16.13
sudo systemctl status postgresql
```

> The Japanese DB already lives on this VPS. Confirm before you reinstall: `sudo -u postgres psql -c "\l"`.

---

## 2. Create database + two-user pattern

The **two-user pattern** matches the Japanese project. The split exists so that an app-user credential leak cannot drop tables.

| Role | Privileges | Used by |
|---|---|---|
| `voyra_admin` | DB owner, full DDL | `prisma migrate`, `prisma db seed`, manual schema work |
| `voyra_app`   | DML only on tables/sequences (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) | Next.js runtime (Vercel + local dev) |

### 2.1 Generate strong passwords first

On your local Mac (do **not** generate on the VPS — copy avoids leaking via shell history):

```bash
openssl rand -hex 24   # → admin password
openssl rand -hex 24   # → app password
```

Use **hex** (alphanumeric only) so the values are URL-safe. `openssl rand -base64` produces `+`, `/`, `=` which break Postgres connection URLs unless you URL-encode (`%2B`, `%2F`, `%3D`).

Store both in a password manager. Never paste into a chat or commit.

### 2.2 Create the DB and roles

```bash
sudo -u postgres psql
```

```sql
-- Database
CREATE DATABASE voyra_bali;

-- Admin (owner; runs migrations)
CREATE USER voyra_admin WITH ENCRYPTED PASSWORD '<ADMIN_HEX>';
ALTER DATABASE voyra_bali OWNER TO voyra_admin;

-- App (runtime; low priv)
CREATE USER voyra_app   WITH ENCRYPTED PASSWORD '<APP_HEX>';
```

### 2.3 Grant runtime privileges

```sql
\c voyra_bali

-- Schema usage
GRANT USAGE ON SCHEMA public TO voyra_app;

-- Tables / sequences that exist now (none yet on a fresh DB; harmless)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO voyra_app;
GRANT USAGE,  SELECT                  ON ALL SEQUENCES IN SCHEMA public TO voyra_app;

-- Future tables: when voyra_admin creates them via prisma migrate,
-- voyra_app gets DML automatically.
ALTER DEFAULT PRIVILEGES FOR ROLE voyra_admin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO voyra_app;
ALTER DEFAULT PRIVILEGES FOR ROLE voyra_admin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO voyra_app;

\q
```

> **`ALTER DEFAULT PRIVILEGES` is the linchpin.** Without it, every new table created by `voyra_admin` would need a manual `GRANT` to `voyra_app`. With it, the runtime user is auto-granted DML on every future table — no migration-time bookkeeping.

---

## 3. Enable remote connections

By default Postgres listens only on `127.0.0.1`. We open it on all interfaces but force SSL + scram-sha-256 auth.

### 3.1 `postgresql.conf`

```bash
sudo nano /etc/postgresql/16/main/postgresql.conf
```

Find and set:

```conf
listen_addresses = '*'
# Optional but recommended:
ssl = on                       # default in Ubuntu's package
password_encryption = scram-sha-256
```

### 3.2 `pg_hba.conf`

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Append at the bottom (preserve existing local rules):

```conf
# Voyra app — remote access, SSL required
hostssl voyra_bali voyra_admin 0.0.0.0/0 scram-sha-256
hostssl voyra_bali voyra_app   0.0.0.0/0 scram-sha-256
hostssl voyra_bali voyra_admin ::/0      scram-sha-256
hostssl voyra_bali voyra_app   ::/0      scram-sha-256
```

> `hostssl` (not `host`) is mandatory: rejects any non-TLS connection at the postgres layer, so even if the firewall is misconfigured a plaintext attempt will be refused.

### 3.3 Apply

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql       # → active (exited)
sudo journalctl -u postgresql -n 50    # check for syntax errors
```

---

## 4. Firewall (ufw)

```bash
sudo ufw allow 5432/tcp
sudo ufw status
```

> **Current state:** open to `0.0.0.0` and `::/0`. **Production-safe state:** restrict to known egress IPs.
> Vercel does not publish stable egress IPs for serverless functions on the standard plan. Two options:
> 1. Leave `0.0.0.0/0` and rely on `hostssl` + `scram-sha-256` + strong passwords (acceptable; widely deployed).
> 2. Use a tunneled DB connection (Cloudflare Tunnel / Tailscale) — reduces blast radius but adds operational complexity.
> The current deployment uses option 1. Document any change in [05-operations-runbook.md](./05-operations-runbook.md).

---

## 5. SSL certificate

Postgres ships with a **self-signed** cert at `/etc/ssl/certs/ssl-cert-snakeoil.pem`. This is enough for `sslmode=require` (Prisma's default) — connections are encrypted but the cert is **not validated** against a CA chain.

For `sslmode=verify-full` (validated chain + hostname), install Let's Encrypt:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone -d db.balitravelnow.com
# Symlink certs into Postgres data dir, owned by postgres
sudo ln -sf /etc/letsencrypt/live/db.balitravelnow.com/fullchain.pem /etc/postgresql/16/main/server.crt
sudo ln -sf /etc/letsencrypt/live/db.balitravelnow.com/privkey.pem   /etc/postgresql/16/main/server.key
sudo chown -h postgres:postgres /etc/postgresql/16/main/server.{crt,key}
sudo systemctl reload postgresql
```

Update connection strings to `sslmode=verify-full` once Let's Encrypt is in place. Until then, `sslmode=require` is the right setting.

---

## 6. Verify from your local Mac

```bash
# Admin connection
PGPASSWORD='<ADMIN_HEX>' psql \
  "host=db.balitravelnow.com port=5432 dbname=voyra_bali user=voyra_admin sslmode=require" \
  -c "SELECT version();"

# App connection
PGPASSWORD='<APP_HEX>' psql \
  "host=db.balitravelnow.com port=5432 dbname=voyra_bali user=voyra_app sslmode=require" \
  -c "SELECT current_user, current_database();"
```

Expected: PostgreSQL banner, then `voyra_app | voyra_bali`. Common failures and fixes:

| Error | Cause | Fix |
|---|---|---|
| `connection refused` | Postgres not listening on public IP | `listen_addresses='*'` + restart |
| `no pg_hba.conf entry for host` | Missing or wrong `hostssl` rule | Re-check §3.2; rule order matters (first match wins) |
| `password authentication failed` | Wrong password OR special char in URL | Confirm hex; if non-hex, URL-encode `/`→`%2F`, `=`→`%3D` |
| `connection timed out` | `ufw` blocks, or Contabo VPS firewall (panel) blocks 5432 | `ufw status`, then check Contabo control panel |
| `SSL connection required` | `sslmode` missing in URL | Add `?sslmode=require` |

---

## 7. Idempotency / rollback

If something breaks before Vercel is updated, you can drop and recreate the DB safely (no production traffic yet):

```sql
\c postgres
DROP DATABASE voyra_bali;
DROP USER voyra_app;
DROP USER voyra_admin;
-- then re-run §2
```

Once Vercel is pointed at the new DB, do **not** drop without a backup. See [05-operations-runbook.md §1](./05-operations-runbook.md).

---

## 8. Post-setup checklist

- [ ] `psql` works from local Mac for both users
- [ ] `\dt` lists `_prisma_migrations` after first migrate (placeholder — populated in [04-prisma-migration-flow.md](./04-prisma-migration-flow.md))
- [ ] Passwords stored in password manager only (not in chat, not in git)
- [ ] `pg_hba.conf` rules use **`hostssl`**, never plain `host` for remote
- [ ] `ufw status` shows 5432 open
- [ ] `sudo journalctl -u postgresql -n 50` has no errors
