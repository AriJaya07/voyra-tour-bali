---
title: 10 · Comms & Notifications
updatedAt: 2026-05-01
---

# 10 · Communications & Notifications

## Goal

Outbound channels: transactional + marketing email (with open + click tracking + unsubscribe), web push (subscribe / unsubscribe / send), and the cookie consent banner. All gated by user preferences and idempotent.

## Surface area

| Concern | File |
|---|---|
| Email transport | [lib/email.ts](../../lib/email.ts) |
| Tracked send abstraction | [lib/services/emailService.ts](../../lib/services/emailService.ts) — `sendTrackedEmail` |
| Open pixel | [app/api/email/open/route.ts](../../app/api/email/open/route.ts) |
| Click redirect | [app/api/email/click/route.ts](../../app/api/email/click/route.ts) |
| Unsubscribe | [app/api/unsubscribe/route.ts](../../app/api/unsubscribe/route.ts), [app/unsubscribe/page.tsx](../../app/unsubscribe/page.tsx) |
| Subscribe (newsletter) | [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts) |
| Notification prefs | [app/api/profile/route.ts](../../app/api/profile/route.ts) (`notificationPref`), `NotificationPref` model |
| Push subscribe | [app/api/push/subscribe/route.ts](../../app/api/push/subscribe/route.ts) |
| VAPID public key | [app/api/push/vapid/route.ts](../../app/api/push/vapid/route.ts) |
| Push send service | [lib/services/pushService.ts](../../lib/services/pushService.ts) |
| Service worker | [public/sw.js](../../public/sw.js) — `push` + `notificationclick` handlers |
| Cookie consent | [components/common/CookieConsent.tsx](../../components/common/CookieConsent.tsx) |
| Models | `EmailDelivery`, `EmailCampaign`, `PushSubscription`, `NotificationPref`, `Subscription` |

## Preconditions

- SMTP creds set (Brevo).
- For push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` set; `web-push` package installed (`npm i web-push`). If absent, push paths must skip silently — the service is lazy-loaded.
- `NEXTAUTH_URL` set so tracking pixel/click URLs are absolute.

---

## Email

### TC-10-01 — `sendTrackedEmail` writes EmailDelivery row before sending

- **When** `sendTrackedEmail({ userId, email, type: "TRIP_REMINDER", subject, html })`.
- **Then** an `EmailDelivery` row is created with `sentAt: null` first, then updated with `sentAt: <date>` after `sendEmail` resolves.
- On `sendEmail` throw, the row's `meta.error` is set and the function re-throws.

### TC-10-02 — Unsubscribe gate

- **Given** `NotificationPref.marketingEmails = false`.
- **When** `sendTrackedEmail({ type: "ABANDONED_WISHLIST", ... })`.
- **Then** returns `{ skipped: true, reason: "UNSUBSCRIBED" }`. No row created. No SMTP call.
- **Exception**: types `PASSWORD_RESET`, `VERIFY`, `BOOKING_CONFIRMATION` always send regardless.

### TC-10-03 — Tracking pixel injected

- **When** the function returns successfully.
- **Then** the rendered HTML contains `<img src="${SITE_URL}/api/email/open?d=<id>" ... />` once. Pixel placed before `</body>` if present, else appended.

### TC-10-04 — Click URLs rewritten

- All `href="https://..."` in the HTML rewritten to `href="${SITE_URL}/api/email/click?d=<id>&u=<encoded>"`. `mailto:` and relative links are not rewritten.

### TC-10-05 — Open pixel records first open only

- **When** GET `/api/email/open?d=42`.
- **Then** `EmailDelivery.openedAt` set if previously null. 1×1 transparent GIF returned with `Cache-Control: no-store`.
- Subsequent GETs do not overwrite (the route uses `where: { openedAt: null }`).

### TC-10-06 — Click redirect captures + 302s

- GET `/api/email/click?d=42&u=https%3A%2F%2Fexample.com` → records first click → redirects to `https://example.com`. Non-http(s) URL → fallback to `/`.

### TC-10-07 — Unsubscribe link

- GET `/unsubscribe?token=<jwt>` (or whichever scheme is in [app/unsubscribe/page.tsx](../../app/unsubscribe/page.tsx)) → confirms the toggle. POST `/api/unsubscribe` flips the relevant `NotificationPref` flag to `false`.

### TC-10-08 — Newsletter subscribe

- POST `/api/subscribe` `{ email }` → `Subscription { email }` upserted. 200 `{ message: "Subscribed" }` even if already present (no enumeration).

## Push

### TC-10-09 — Public VAPID key

- GET `/api/push/vapid` → `{ publicKey: <string|null> }`. Null when env var missing — UI must hide the "Enable notifications" button in that case.

### TC-10-10 — Subscribe endpoint validates payload

- POST `/api/push/subscribe` `{ endpoint, keys: { p256dh, auth } }` as signed-in user → `{ ok: true, id }`. `PushSubscription` upserted by `endpoint`. UA captured.
- Missing field → `400`. Unauthenticated → `401`.

### TC-10-11 — Unsubscribe endpoint

- DELETE `/api/push/subscribe` `{ endpoint }` as the owner → `{ ok: true }`. Row removed.

### TC-10-12 — `sendPushToUser` skips when no key/lib

- **Given** `VAPID_PUBLIC_KEY` empty OR `web-push` package not installed.
- **When** `sendPushToUser(userId, payload)`.
- **Then** returns `{ sent: 0, skipped: "no-vapid-or-lib" }`. No exception.

### TC-10-13 — `sendPushToUser` prunes 404/410

- For each subscription that returns `statusCode 404|410`, the row is deleted. Successful pushes counted in `sent`.

### TC-10-14 — Service worker handles push

- Dispatch a synthetic `push` event to the SW with payload `{ title, body, url }` → `self.registration.showNotification` called with the right options. Click → `clients.openWindow(url)` or focus existing tab matching URL.

## Cookie consent

### TC-10-15 — Banner appears on first visit

- Fresh browser, no `voyra_cookie_consent_v1` key → banner visible at bottom-left (mobile bottom-inset).
- Click "Essential only" → key `{ choice: "essential", ts }` saved. Banner hidden.
- Click "Accept all" → key `{ choice: "accepted", ts }` saved. `voyra:cookie-accepted` CustomEvent dispatched (analytics components listen for this).

### TC-10-16 — Banner does not show on dashboard

- `/dashboard/*` skips the banner ([LayoutWrapper.tsx](../../components/Wrapper/LayoutWrapper.tsx) `isDashboard` branch).

### TC-10-17 — Persistence across sessions

- Reload after choice → banner does not reappear.

---

## Manual QA checklist

- [ ] Trigger `/api/cron/trip-reminders` (with bearer) on a confirmed booking with `travelDate = tomorrow` → email arrives, has tracking pixel + rewritten links
- [ ] Open the email → `EmailDelivery.openedAt` populated within 30 s
- [ ] Click any link in the email → redirected, `clickedAt` populated
- [ ] Toggle off "trip reminders" in `/profile/notifications` → re-trigger cron → no email
- [ ] Click an unsubscribe link in a marketing email → `NotificationPref.marketingEmails = false`
- [ ] On a desktop with VAPID configured + `web-push` installed: click "Enable notifications" → SW subscription succeeds → `PushSubscription` row created
- [ ] Send a test push → notification appears → click → opens the right URL
- [ ] Disable notifications in browser → next push send returns `pruned: 1` after the next attempt
- [ ] Open the site fresh in incognito → cookie banner appears
- [ ] Click "Accept all" → reload → no banner

## Third-party / local response checklist

| Surface | Provider | Expect |
|---|---|---|
| `transporter.sendMail` | Brevo | resolves; envelope echoed in `info` |
| Open pixel | local | 200 `image/gif`, 43-byte body, `no-store` |
| Click redirect | local | 302 → `Location: <decoded url or />` |
| Push send | web-push lib → browser push service | 201/204 success; 404/410 → prune |
| `VAPID public key` | local | base64url string when set, else `null` |
| Cookie consent | local (`localStorage`) | key `voyra_cookie_consent_v1` `{ choice, ts }` |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| All emails marked `openedAt` instantly | clients pre-fetching pixels (Apple Mail) | acknowledge as known industry caveat — open rate is upper bound |
| Click redirect to `/` even with valid URL | URL not absolute, `new URL` threw | encode the original url, double-decode on the redirect side |
| Push send returns `skipped: no-vapid-or-lib` after `npm i web-push` | server not restarted | restart Next dev / re-deploy |
| Cookie banner reappears after every reload | localStorage write blocked (private mode) | guard with try/catch (already in code) — banner just stays visible in private mode |
| Email tracking pixel breaks layout | injected `<img>` without `display:none` | already styled `display:none`; verify in Litmus |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

`/api/email/open`, `/api/email/click`, `/api/unsubscribe`, `/api/subscribe`, `/api/push/subscribe`, `/api/push/vapid` all in output. `public/sw.js` present.
