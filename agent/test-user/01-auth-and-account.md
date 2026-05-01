---
title: 01 · Auth & Account
updatedAt: 2026-05-01
---

# 01 · Auth & Account

## Goal

Every entry point a user has to identify themselves works: register, verify email, log in (credentials + Google), recover password, lock out brute force, edit profile, manage saved travelers and notification preferences.

## Surface area

| Concern | File |
|---|---|
| NextAuth options | [utils/common/auth.ts](../../utils/common/auth.ts) |
| Catch-all route | [app/api/auth/[...nextauth]/route.ts](../../app/api/auth/%5B...nextauth%5D/route.ts) |
| Register | [app/api/auth/register/route.ts](../../app/api/auth/register/route.ts) — also handles `referralCode` (200 SIGNUP pts) |
| Verify email | [app/api/auth/verify/route.ts](../../app/api/auth/verify/route.ts) |
| Resend verify | [app/api/auth/resend-verification/route.ts](../../app/api/auth/resend-verification/route.ts) |
| Forgot pw | [app/api/auth/forgot-password/route.ts](../../app/api/auth/forgot-password/route.ts) |
| Reset pw | [app/api/auth/reset-password/route.ts](../../app/api/auth/reset-password/route.ts) |
| Turnstile verify | [utils/verifyTurnstile.ts](../../utils/verifyTurnstile.ts) |
| Login UI | [app/login/page.tsx](../../app/login/page.tsx) |
| Register UI | [app/register/page.tsx](../../app/register/page.tsx) |
| Profile shell | [app/profile/page.tsx](../../app/profile/page.tsx) |
| Settings | [app/profile/settings/page.tsx](../../app/profile/settings/page.tsx) |
| Travelers (saved pax) | [app/profile/travelers/page.tsx](../../app/profile/travelers/page.tsx), [app/api/saved-travelers/route.ts](../../app/api/saved-travelers/route.ts) |
| Notif prefs | [app/profile/notifications/page.tsx](../../app/profile/notifications/page.tsx), [app/api/profile/route.ts](../../app/api/profile/route.ts) |
| Account delete (anonymise) | [app/api/account/route.ts](../../app/api/account/route.ts) |
| Models | `User`, `Account`, `SavedTraveler`, `NotificationPref`, `LoyaltyAccount`, `Referral` |

## Preconditions

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Turnstile keys, SMTP block all set.
- `prisma migrate deploy` complete; `prisma db seed` has created `admin@travel.com` / `admin123`.

---

## Test cases

### TC-01-01 — Register a new email

- **Given** an empty `User` row matching the test email.
- **When** POST `/api/auth/register` with `{ email, password, name, turnstileToken }`.
- **Then** `200`, body `{ message: "Verification email sent" }` (legacy `{message}` shape — see [api-patterns.md §5.3](../docs/api-patterns.md)). DB has `User { emailVerified: false, role: "USER" }`. SMTP has been called once (assert via `nodemailer.createTransport` mock with `jsonTransport`).
- **Type**: Integration.

### TC-01-02 — Register with `referralCode` credits inviter on conversion (signup leg)

- **Given** an existing user `inviter` with a Referral row `code=ABC123 status=PENDING`.
- **When** POST `/api/auth/register` with `{ email, password, name, turnstileToken, referralCode: "ABC123" }`.
- **Then** Referral row updated `status=SIGNED_UP`, `inviteeUserId=<new id>`. Invitee's `LoyaltyAccount.pointsBalance = 200` and one `LoyaltyLedger` row with `reason=SIGNUP delta=200`.
- **Type**: Integration.
- **Also see**: [06-loyalty-and-referral.md](./06-loyalty-and-referral.md) for the conversion (first booking) leg.

### TC-01-03 — Register rejects weak password

- **Given** body with `password: "abc"`.
- **Then** `400 { message: "..." }` (legacy shape). No User row created.

### TC-01-04 — Register rejects on Turnstile failure

- **Given** `verifyTurnstile()` mocked to return `false`.
- **Then** `400 { message: "Captcha failed" }`.

### TC-01-05 — Verify email by token

- **Given** `User.emailVerificationToken = "tok"`, expiry > now.
- **When** GET `/api/auth/verify?token=tok`.
- **Then** redirect to `/login?verified=1`. `User.emailVerified = true`, token cleared.

### TC-01-06 — Login as unverified USER fails

- **Given** `User { role: "USER", emailVerified: false }`.
- **When** NextAuth `signIn("credentials")`.
- **Then** error `EMAIL_NOT_VERIFIED`. No session.

### TC-01-07 — Login locks after 3 failed attempts

- **Given** valid email but wrong password three times in 60 s.
- **Then** 4th attempt rejected with `ACCOUNT_LOCKED`. `User.loginLockedUntil` is in the future. After 60 s, login succeeds with correct password and counters reset.
- **Type**: Integration.

### TC-01-08 — Google OAuth creates User on first sign-in

- **Given** new Google identity.
- **When** sign-in via Google.
- **Then** `User { role: "USER", emailVerified: true }` created (Google identities are pre-verified). `Account` row links provider.

### TC-01-09 — Forgot password emits one-time token

- **When** POST `/api/auth/forgot-password` with `{ email }`.
- **Then** `200 { message: "If the email exists..." }` (no enumeration). DB has `User.passwordResetToken` populated, expiry +1h.

### TC-01-10 — Reset password rotates hash

- **Given** valid reset token.
- **When** POST `/api/auth/reset-password` with `{ token, password: "NewP@ss12" }`.
- **Then** `200 { message: ... }`. Token cleared. `bcrypt.compare("NewP@ss12", user.password)` returns true.

### TC-01-11 — Profile API returns own user only

- **When** GET `/api/profile` as user A.
- **Then** body contains user A's `email`, `name`, `image`, `loyalty.pointsBalance`, `notificationPref.*`. Never anyone else's id.

### TC-01-12 — Update notification preferences

- **When** PATCH `/api/profile` with `{ notificationPref: { tripReminders: false, marketingEmails: true } }`.
- **Then** `200`. Subsequent emails of type `TRIP_REMINDER` skip via [lib/services/emailService.ts](../../lib/services/emailService.ts). Marketing emails still send.

### TC-01-13 — Saved travelers CRUD

- POST `/api/saved-travelers` `{ name, dateOfBirth, passportNo? }` → `201` traveler row tied to `userId`.
- GET → list of own travelers.
- DELETE `/api/saved-travelers?id=X` → `200`. 404 if not owned.

### TC-01-14 — Account delete anonymises rather than cascades

- **When** DELETE `/api/account`.
- **Then** `User.email = "deleted-<id>@voyra"`, `name = "Deleted user"`, `password = null`, OAuth Account rows removed, Bookings retained with `userId = original` for legal records (rationale in [agent/docs/domain.md](../docs/domain.md)).

### TC-01-15 — Sign-out clears wishlist/recently-viewed cache

- **Given** signed-in user with wishlist + recently-viewed.
- **When** sign out.
- **Then** in-memory Zustand stores empty (no `voyra_*` localStorage keys remain — the project DB-only decision: [agent/docs/tech-debt.md](../docs/tech-debt.md)).

---

## Manual QA checklist

- [ ] Register with new email → verification email arrives
- [ ] Click verification link → redirected with `?verified=1` → can log in
- [ ] Wrong password 3× → locked → wait 60 s → unlock
- [ ] Forgot password full round trip
- [ ] Sign in with Google (first time) → user created, redirected to `/`
- [ ] Edit profile name → reflected in navbar avatar dropdown
- [ ] Add a saved traveler → reappears at `/checkout` traveler picker
- [ ] Toggle "marketing emails" off in `/profile/notifications` → confirm `notificationPref.marketingEmails === false` via `GET /api/profile`
- [ ] Register with `?ref=ABC` (or invite link) → invitee shows 200 SIGNUP pts in `/profile/rewards`
- [ ] Delete account → email anonymised, redirected, can no longer log in

## Third-party / local response checklist

| Surface | Provider | Expect |
|---|---|---|
| Register email | Brevo SMTP via Nodemailer | `transporter.sendMail` resolves; no `Error: ECONNREFUSED` |
| Turnstile verify | Cloudflare | `siteverify` JSON `{ success: true }` |
| Google OAuth | Google | `id_token`, `access_token` in callback |
| Local DB | Prisma | `User { id, email, role }` shape per [prisma/schema.prisma](../../prisma/schema.prisma) |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| "Account is locked" before any failed attempts | clock skew between dev DB and host | sync clocks, clear `loginAttempts` |
| Verification email never arrives | SMTP creds wrong | check Brevo dashboard, confirm `SMTP_USER/PASS` |
| Google login redirects then hangs | redirect URI not added in Google Cloud | add both `localhost` and prod URIs |
| Register hangs on Turnstile | site key mismatch | confirm `NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY` matches site |
| `signIn("credentials")` returns `null` with no error | NextAuth swallowed it — check `[next-auth][error]` server log | fix root error |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

Both must exit `0`. Confirm `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile/*` all appear in the build output.
