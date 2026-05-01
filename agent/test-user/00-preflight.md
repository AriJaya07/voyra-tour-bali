---
title: 00 · Preflight
updatedAt: 2026-05-01
---

# 00 · Preflight — env, DB, build baseline

> Run this before any other spec. Fails fast on broken environment so you don't waste hours chasing a phantom regression.

## Goal

Prove the workstation can compile, type-check, migrate, and serve the app before exercising any feature.

## Surface area

| Concern | File |
|---|---|
| Env variables | [agent/docs/environment.md](../docs/environment.md), `.env.local` |
| Prisma schema | [prisma/schema.prisma](../../prisma/schema.prisma) |
| Migration history | [prisma/migrations/](../../prisma/migrations/) |
| TS config | [tsconfig.json](../../tsconfig.json) |
| Build | `next build` via `package.json:scripts.build` |
| Lint | `npm run lint` |

## Preconditions

- Node ≥ 18 (20 LTS recommended). `node --version`.
- PostgreSQL reachable at `DATABASE_URL`. `psql "$DATABASE_URL" -c '\dt'` succeeds.
- `.env.local` populated from [agent/docs/environment.md §4](../docs/environment.md).

## Test cases

### TC-00-01 — env loads

- **Given** a fresh shell.
- **When** I run `node -e "require('dotenv').config({path:'.env.local'}); console.log(!!process.env.DATABASE_URL, !!process.env.NEXTAUTH_SECRET, !!process.env.MIDTRANS_SERVER_KEY)"`.
- **Then** all three booleans are `true`.
- **Type**: Unit (manual).

### TC-00-02 — Prisma client generates

- **Given** schema unchanged.
- **When** `npx prisma generate`.
- **Then** exit code 0, `node_modules/.prisma/client/index.d.ts` exists.

### TC-00-03 — migrations apply cleanly

- **Given** an empty test DB.
- **When** `DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy`.
- **Then** exit code 0, every migration in [prisma/migrations/](../../prisma/migrations/) applied. The latest expected migration is `20260508000000_events_guides_push` (BaliEvent / TourGuide / PushSubscription).

### TC-00-04 — typecheck passes

- **When** `npx tsc --noEmit`.
- **Then** exit code 0, **zero** errors. Hints (severity: Hint) are tolerated.

### TC-00-05 — lint passes

- **When** `npm run lint`.
- **Then** exit code 0. Warnings tolerated (audit at sprint review).

### TC-00-06 — production build passes

- **When** `npx next build`.
- **Then** exit code 0. Output lists every page in [app/](../../app/) including the post-Phase-16 routes:
  - `/compare` (B9)
  - `/notes` (D4)
  - `/bali-events` (B5)
  - `/guides/profiles/[slug]` (B8)
  - `/dashboard/operators` (A7), `/dashboard/guides` (A5)
  - API: `/api/email/open`, `/api/email/click`, `/api/push/subscribe`, `/api/push/vapid`, `/api/notes/feed`, `/api/loyalty/redeem`, `/api/admin/operators`, `/api/admin/guides`, `/api/bali-events`, `/api/tour-guides`.
  Any missing route → fail.

### TC-00-07 — dev server boots

- **When** `npm run dev`.
- **Then** within 30 s, `curl -sf http://localhost:3000/` returns 200 and HTML body contains the homepage hero.

### TC-00-08 — Prisma client matches schema

- **When** `npx prisma validate`.
- **Then** exit code 0.

### TC-00-09 — service worker is served

- **Given** dev server running.
- **When** `curl -sI http://localhost:3000/sw.js`.
- **Then** `200 OK`, `Content-Type: application/javascript` (or `text/javascript`). Body contains both `addEventListener("push"` and `addEventListener("notificationclick"` (added in Phase 16+).

### TC-00-10 — manifest + icons reachable

- **When** `curl -sI http://localhost:3000/manifest.json`, `curl -sI http://localhost:3000/images/icons/icon-192.png`, `curl -sI http://localhost:3000/images/icons/icon-512.png`, `curl -sI http://localhost:3000/images/icons/apple-touch-icon.png`.
- **Then** all four return `200`.

## Manual QA checklist

- [ ] `node --version` ≥ 18
- [ ] `psql "$DATABASE_URL" -c 'SELECT 1'` succeeds
- [ ] `.env.local` matches the table in [agent/docs/environment.md §3](../docs/environment.md)
- [ ] `npx prisma migrate status` shows **no pending** migrations
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npx next build` exits 0
- [ ] `curl -sI http://localhost:3000/` returns 200
- [ ] `/manifest.json`, `/sw.js`, `/images/icons/icon-192.png`, `/images/icons/icon-512.png` all 200

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `Error: P1001: Can't reach database server` | wrong `DATABASE_URL` or DB not running | start Postgres / fix URL |
| `Module not found: 'web-push'` at build | only used at runtime; harmless. If you want push, `npm i web-push` and set VAPID env | install + env |
| `Type error: Property 'X' does not exist on type 'Prisma...'` | stale generated client | `npx prisma generate` |
| Missing `/compare` or `/bali-events` in build output | dev server cached old route tree | `rm -rf .next && npx next build` |
| `next build` warns about Edge runtime | unrelated to phase 16 work; check `runtime` exports if you added one | remove `runtime = "edge"` from incompatible routes |
