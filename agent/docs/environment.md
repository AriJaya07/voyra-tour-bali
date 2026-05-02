# Environment — Voyra Tour Bali

> Setup, environment variables, and third-party service configuration. Pairs with the [README](../README.md) (which covers commands).

---

## 1. Local prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 18 (20 LTS recommended) | Required by Next 16 + Prisma 6 |
| npm | ≥ 9 | repo uses `package-lock.json` |
| PostgreSQL | 14+ | local install or hosted (Supabase, Neon, Railway, RDS) |
| Vercel CLI | latest | `npm i -g vercel` for `vercel env pull` |

---

## 2. Environment files

| File | Used by | Tracked in git? |
|---|---|---|
| `.env.local` | local dev (`next dev`) | ❌ ignored |
| `.env.development` | local dev defaults | ❌ ignored |
| `.env` | fallback (Prisma reads this directly when invoked) | ❌ ignored |
| `.env.production` | not used — values live in Vercel | n/a |

Use `vercel env pull .env.local` to sync the canonical set from Vercel.

---

## 3. Variables — full reference

> ⚠️ Every variable below is **required** unless marked optional. Missing values surface as runtime 500s; there is no startup gate.

### 3.1 Database
| Name | Example | Used by |
|---|---|---|
| `DATABASE_URL` | `postgresql://USER:PASS@host:5432/voyra_tourism?schema=public` | Prisma |
| `DIRECT_URL` *(optional, for poolers like Supabase)* | direct connection without pooler | `prisma migrate` |

### 3.2 NextAuth
| Name | Example | Notes |
|---|---|---|
| `NEXTAUTH_SECRET` | 32+ random bytes (`openssl rand -base64 32`) | sign / encrypt JWTs |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) / `https://yourdomain.com` (prod) | callback URL builder |

### 3.3 Google OAuth
| Name | Example |
|---|---|
| `GOOGLE_CLIENT_ID` | from Google Cloud Console → OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | as above |

Authorized redirect URI in Google Cloud:
- Local: `http://localhost:3000/api/auth/callback/google`
- Prod: `https://yourdomain.com/api/auth/callback/google`

### 3.4 Cloudflare Turnstile (CAPTCHA)
| Name | Where it's used |
|---|---|
| `NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY` | client widget on login/register |
| `CF_TURNSTILE_SECRET_KEY` | server verification in `utils/verifyTurnstile.ts` |

### 3.5 AWS S3 (image storage — primary)
| Name | Example |
|---|---|
| `AWS_REGION` | `ap-southeast-2` |
| `AWS_STORAGE_BUCKET` | `tourism-file` (or your bucket) |
| `AWS_ACCESS_KEY_ID` | IAM user with `s3:PutObject`, `s3:DeleteObject` on the bucket |
| `AWS_SECRET_ACCESS_KEY` | as above |
| `AWS_PUBLIC_BASE_URL` *(optional)* | CloudFront / custom domain in front of S3 |

The bucket policy must allow public read on uploaded objects (or front it with CloudFront). `next.config.ts` whitelists `*.s3.ap-southeast-2.amazonaws.com` under `images.remotePatterns`.

### 3.6 Cloudinary (configured but unused — see [tech-debt.md](./tech-debt.md))
| Name | Example |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | `your-cloud` |
| `CLOUDINARY_API_KEY` | … |
| `CLOUDINARY_API_SECRET` | … |

### 3.7 Midtrans (payment)
| Name | Example |
|---|---|
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-...` (sandbox) / `Mid-server-...` (prod) |
| `MIDTRANS_CLIENT_KEY` | client-side Snap key |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | mirror exposed to browser |
| `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` | `"true"` or `"false"` |
| `MIDTRANS_SNAP_URL` *(optional)* | override Snap.js URL if needed |

Webhook URL to configure in Midtrans dashboard:
- `https://yourdomain.com/api/payment/notification`

Sandbox test cards: see Midtrans docs (`4811 1111 1111 1114` is the standard success card).

### 3.8 Viator (tour catalog)
| Name | Example |
|---|---|
| `VIATOR_API_KEY` | from Viator Partner portal (`exp-api-key` header) |
| `VIATOR_API_URL` | `https://api.viator.com/partner` (or sandbox URL) |
| `NEXT_PUBLIC_VIATOR_MOCK_BOOKING` | `"true"` to short-circuit live calls in dev/staging |
| `VIATOR_DEFAULT_CURRENCY` *(optional)* | defaults to `IDR` |
| `NEXT_PUBLIC_VIATOR_PARTNER_ID` *(optional)* | Viator affiliate partner id (default `P00292613`); appended as `?pid=` on outbound product redirects from `/viator/[productCode]` |

### 3.9 Email (Brevo SMTP)
| Name | Example |
|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Brevo SMTP username |
| `SMTP_PASS` | Brevo SMTP API key |
| `SMTP_FROM` | `Voyra <noreply@yourdomain.com>` |

### 3.10 AI (Groq)
| Name | Example |
|---|---|
| `GROQ_API_KEY` | from console.groq.com |
| `GROQ_MODEL` *(optional)* | defaults inside `app/api/ai/route.ts` (`llama-3.3-70b-versatile`) |

### 3.10b Web Push (optional — push notifications)

| Name | Example |
|---|---|
| `VAPID_PUBLIC_KEY` | base64url public key (`web-push.generateVAPIDKeys().publicKey`) |
| `VAPID_PRIVATE_KEY` | base64url private key |
| `VAPID_SUBJECT` *(optional, default `mailto:support@voyra.id`)* | `mailto:` URL or `https://` URL |

If absent, `lib/services/pushService.ts` skips silently. Install with `npm i web-push`. Generate keys:

```bash
npx --package=web-push -- web-push generate-vapid-keys
```

### 3.11 Cron secret
| Name | Example |
|---|---|
| `CRON_SECRET` | random 32-byte string; used in `Authorization: Bearer ${CRON_SECRET}` header |

Configure Vercel Cron jobs in the dashboard with that header.

### 3.12 SEO / verification
| Name | Example |
|---|---|
| `GOOGLE_SITE_VERIFICATION` | meta verification string from Search Console |

### 3.13 Analytics (optional)
| Name | Example |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `G-XXXXXXXXXX` |
| `NEXT_PUBLIC_GTM_ID` | `GTM-XXXXXXX` |

### 3.14 External feeds
| Name | Example |
|---|---|
| `BALI_NEWS_API` | base URL for the news/destinations feed (default `https://traveller-be.onrender.com`) |

### 3.15 Marketing / contact
| Name | Example |
|---|---|
| `NEXT_PUBLIC_WA_NUMBER` | WhatsApp number used in floating CTA (`+62...`) |

### 3.16 AI subscription + credits
| Name | Example | Notes |
|---|---|---|
| `AI_CREDIT_GUARD` *(optional, default `on`)* | `off` | Kill switch — when `off`, `aiCreditService.reserveCredits` always returns ok and bills no credits. Use only for incident response; metrics still write to `AiUsage`. |
| `AI_GUEST_HASH_SALT` *(optional)* | random hex | Salt used to SHA-256 guest IPs in `AiUsage.ipHash`. Falls back to `NEXTAUTH_SECRET` if unset. |
| `ENABLE_AI_VISION` *(optional, default `false`)* | `true` | Enables `/api/ai/voucher-read`. Requires `ANTHROPIC_API_KEY`. |
| `ANTHROPIC_API_KEY` *(required when vision enabled)* | `sk-ant-...` | console.anthropic.com → API Keys. |
| `AI_VISION_MODEL` *(optional)* | `claude-haiku-4-5-20251001` | Override default vision model. |

Cron jobs added by the AI subsystem (register in Vercel dashboard or `vercel.json`):
- `/api/cron/ai-subscription-renewals` — daily 18:00 UTC
- `/api/cron/ai-renewal-reminders` — daily 01:00 UTC
- `/api/cron/ai-grace-sweep` — hourly
- `/api/cron/ai-expire-credits` — daily 19:00 UTC
- `/api/cron/ai-usage-rollup` — daily 20:00 UTC
- `/api/cron/ai-welcome-followup` — daily 09:30 UTC (T-3 / T-1 / post-expire welcome emails)

All gated by `Authorization: Bearer ${CRON_SECRET}`.

---

## 4. `.env.local` — copy-paste template

```env
# === Database ===
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/voyra_tourism?schema=public"

# === NextAuth ===
NEXTAUTH_SECRET="REPLACE_WITH_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"

# === Google OAuth ===
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# === Cloudflare Turnstile ===
NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY="0x4AAA..."
CF_TURNSTILE_SECRET_KEY=""

# === AWS S3 ===
AWS_REGION="ap-southeast-2"
AWS_STORAGE_BUCKET="tourism-file"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# === Cloudinary (unused today) ===
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# === Midtrans ===
MIDTRANS_SERVER_KEY="SB-Mid-server-..."
MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION="false"

# === Viator ===
VIATOR_API_KEY=""
VIATOR_API_URL="https://api.viator.com/partner"
NEXT_PUBLIC_VIATOR_MOCK_BOOKING="true"

# === Email (Brevo) ===
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Voyra <noreply@yourdomain.com>"

# === Groq ===
GROQ_API_KEY=""

# === Web Push (optional) ===
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:support@yourdomain.com"

# === Cron ===
CRON_SECRET="REPLACE_WITH_RANDOM_STRING"

# === SEO ===
GOOGLE_SITE_VERIFICATION=""

# === Analytics ===
NEXT_PUBLIC_GA_MEASUREMENT_ID=""
NEXT_PUBLIC_GTM_ID=""

# === External feeds ===
BALI_NEWS_API="https://traveller-be.onrender.com"

# === Marketing ===
NEXT_PUBLIC_WA_NUMBER="+62XXXXXXXXXXX"
```

---

## 5. First-time setup

```bash
# 1. clone + install
git clone <repo>
cd voyra-tour-bali
npm install                       # postinstall runs `prisma generate`

# 2. env
cp .env.example .env.local        # if .env.example exists; else fill from §4
# fill in DATABASE_URL etc.

# 3. database
npx prisma migrate dev --name init
npx prisma db seed                # creates admin@travel.com / admin123

# 4. run
npm run dev                       # http://localhost:3000
```

Default seeded admin: `admin@travel.com` / `admin123`. **Change immediately in any non-local env.**

---

## 6. Vercel setup

```bash
vercel login
vercel link                       # connect local repo to Vercel project
vercel env pull .env.local        # pull live vars to local
```

Add every variable from §3 into Vercel → Project → Settings → Environment Variables, scoped to:
- **Production** — live values.
- **Preview** — sandbox keys (Midtrans sandbox, Viator mock, etc.).
- **Development** — when using `vercel dev` locally.

Vercel cron jobs (configured in dashboard under **Cron Jobs**):

| Schedule | Path | Header |
|---|---|---|
| `0 1 * * *` (daily 01:00) | `/api/cron/auto-complete-bookings` | `Authorization: Bearer ${CRON_SECRET}` |
| `0 */6 * * *` (every 6 h) | `/api/cron/viator-sync` | same |
| `0 */6 * * *` | `/api/cron/viator-products-sync` | same |
| `0 2 * * *` (daily 02:00) | `/api/cron/viator-daily-sync` | same |

---

## 7. Build script (recommended)

Wire migrations into the Vercel build so prod schema stays in sync:

```json
"scripts": {
  "build": "prisma migrate deploy && prisma generate && next build"
}
```

The repo's current `build` is plain `next build`. Adopt this when you have prod migration discipline.

---

## 8. Secrets hygiene

- Never commit `.env*` files. `.gitignore` should list `.env`, `.env.*`, except `.env.example`.
- Rotate any key that has touched git history.
- Rotate `NEXTAUTH_SECRET` only with a planned session-invalidation window.
- Rotate `MIDTRANS_SERVER_KEY` and `VIATOR_API_KEY` annually or on staff turnover.
- Cloudinary / S3 credentials: prefer scoped IAM users; never use root account keys.

---

## 9. Where each variable is read

| File | Reads |
|---|---|
| `lib/prisma.ts` | `DATABASE_URL` (implicit via Prisma) |
| `utils/common/auth.ts` | `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `utils/verifyTurnstile.ts` | `CF_TURNSTILE_SECRET_KEY` |
| `utils/common/s3.ts` | `AWS_*` |
| `utils/common/cloudinary.ts` | `CLOUDINARY_*` |
| `lib/email.ts` | `SMTP_*` |
| `lib/config/midtrans.ts` | `MIDTRANS_*` |
| `lib/config/viator.ts` | `VIATOR_*`, `NEXT_PUBLIC_VIATOR_MOCK_BOOKING` |
| `app/api/payment/notification/route.ts` | `MIDTRANS_SERVER_KEY` (signature) |
| `app/api/cron/**` | `CRON_SECRET` |
| `lib/newsApi.ts` | `BALI_NEWS_API` |
| `components/AIChatWidget.tsx` / `app/api/ai` | `GROQ_API_KEY` |
| `lib/services/pushService.ts` / `app/api/push/**` / `app/api/cron/calendar-event-reminders/**` / `app/api/cron/notification-broadcasts/**` | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| `lib/services/notificationService.ts` / `app/api/admin/notifications/**` / `app/api/notifications/**` | `VAPID_*` (push fan-out), `SMTP_*` (email fan-out) |
| `lib/services/emailService.ts`, `app/api/email/**` | `NEXTAUTH_URL` (used to build absolute pixel + click URLs) |

If you add a new env var, also add it to:
1. The table in §3.
2. The template in §4.
3. The "where it's read" map in §9.
4. The Vercel dashboard (all environments).
