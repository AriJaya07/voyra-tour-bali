---
title: 11 · PWA & Status
updatedAt: 2026-05-01
---

# 11 · PWA & Status

## Goal

The app is installable, offline-resilient on previously-visited pages, and the public `/status` page exposes a quick health check.

## Surface area

| Concern | File |
|---|---|
| Manifest | [public/manifest.json](../../public/manifest.json) |
| Service worker | [public/sw.js](../../public/sw.js) — cache strategy + push handlers |
| Icons | [public/images/icons/icon-192.png](../../public/images/icons/icon-192.png), [icon-512.png](../../public/images/icons/icon-512.png), [apple-touch-icon.png](../../public/images/icons/apple-touch-icon.png), [icon.svg](../../public/images/icons/icon.svg) (master) |
| Layout head | [app/layout.tsx](../../app/layout.tsx) — `<link rel="manifest">`, theme-color, apple-touch-icon |
| Status page | [app/status/page.tsx](../../app/status/page.tsx) |
| Robots | [app/robots.ts](../../app/robots.ts) |
| Sitemap | [app/sitemap.ts](../../app/sitemap.ts) |

---

## Test cases

### TC-11-01 — Manifest reachable + valid

- GET `/manifest.json` → 200 application/json. Must include `name`, `short_name`, `start_url`, `display`, `theme_color`, `background_color`, and an `icons[]` with at least one 192×192 and one 512×512 PNG.

### TC-11-02 — Icons reachable

- GET `/images/icons/icon-192.png` → 200 image/png. Same for `icon-512.png`, `apple-touch-icon.png`, `icon.svg`.

### TC-11-03 — Layout links are correct

- Render `app/layout.tsx`. Head contains:
  - `<link rel="manifest" href="/manifest.json" />`
  - `<meta name="theme-color" content="#0071CE" />`
  - `<link rel="apple-touch-icon" href="/images/icons/apple-touch-icon.png" />`

### TC-11-04 — Service worker registers

- Page registers `/sw.js` (look for the registration call in `components/providers/*` or `_app`-equivalent). DevTools → Application → Service Workers shows it active. Scope = `/`.

### TC-11-05 — Cache strategy: HTML network-first

- Visit `/` online → reload offline → `/` still renders (served from `voyra-v1` cache). Verified via DevTools Network "Offline" toggle.

### TC-11-06 — Static assets cached

- `/images/*`, `/_next/static/*`, `*.css|*.js|*.woff2|*.png|*.jpg|*.svg|*.webp` cached in `voyra-static-v1`. Second load shows `(ServiceWorker)` in network panel.

### TC-11-07 — API never cached

- `/api/*` always hits network — never returns stale data. Verified via SW source: `if (url.pathname.startsWith("/api/")) return;`.

### TC-11-08 — Push handler

- See [10-comms-and-notifications.md TC-10-14](./10-comms-and-notifications.md). The SW's `push` listener parses JSON and calls `showNotification(title, opts)`.

### TC-11-09 — Notification click handler

- Default routes to `/`. If `data.url` set, focuses existing tab matching URL or opens a new one.

### TC-11-10 — Lighthouse PWA audit

- Run Lighthouse in Chrome → PWA section ≥ "installable" (manifest valid, SW present, served over HTTPS in prod). Local HTTP is fine for the dev check.

### TC-11-11 — Status page

- GET `/status`. No auth required. Renders cards for: Database, Viator, SMTP, Push (VAPID configured?), Service worker active. Each shows green / yellow / red.
- Implementation note: keep checks **cheap** — a single Prisma `SELECT 1` for DB, env-var presence for the rest. Don't ping upstream per request — cache the result for 60 s.

### TC-11-12 — Offline ticket viewing

- After viewing `/ticket/<token>` online once, the same URL reloads in airplane mode (offline). Should serve the cached HTML.

---

## Manual QA checklist

- [ ] Lighthouse PWA in Chrome shows "Installable"
- [ ] Mobile browser → "Add to Home Screen" prompt eventually appears
- [ ] Open from home screen → splash screen with `theme_color` background
- [ ] Reload offline → `/` still loads
- [ ] `/api/destinations` offline → fails (network-only by design)
- [ ] `/status` reachable without sign-in; turns red when DB stopped
- [ ] After enabling notifications + sending a test push → notification appears even when tab closed (in supporting OS)

## Third-party / local response checklist

| Surface | Expect |
|---|---|
| `/manifest.json` | JSON with `icons` referencing existing files |
| `/sw.js` | JS body containing `addEventListener("install"`, `"fetch"`, `"push"`, `"notificationclick"` |
| `/images/icons/*` | 200 PNG (or SVG) |
| `/status` | HTML with at least the subsystems list |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Add-to-home-screen prompt never appears | manifest icon mismatch (192/512) | regenerate via `rsvg-convert` (script in repo notes) |
| SW serves stale HTML forever | bumped HTML changed but cache name unchanged | bump `CACHE_NAME` in `sw.js` |
| `/status` 500 when DB down | Prisma query throws | wrap in try/catch and report red |
| Push doesn't fire after deploy | new SW didn't activate (clients claim missing) | already calls `self.clients.claim()` — hard reload to verify |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

Confirm `/status` builds. Manifest + sw.js + icons live in `public/`, so they bypass build but must be present.

```bash
ls public/images/icons/  # icon-192.png, icon-512.png, apple-touch-icon.png, icon.svg
ls public/sw.js public/manifest.json
```
