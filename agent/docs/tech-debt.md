# Tech Debt — Voyra Tour Bali

> Known weaknesses, workarounds, and areas that need investment. Read this before "while I'm here…" cleanups so you don't accidentally regress something deliberate.

Severity scale:
- 🔴 **High** — risk of data loss, money loss, or security exposure.
- 🟠 **Medium** — slows iteration, raises bug rate, no immediate breach.
- 🟡 **Low** — cosmetic / repo hygiene.

---

## 1. Data integrity & transactions

### ✅ 1.1 Nested writes — RESOLVED
**Was:** Multi-step writes used `Promise.all`, not `prisma.$transaction`. Partial failures left orphans.
**Status:** Fixed in [`app/api/destinations/route.ts`](../../app/api/destinations/route.ts), [`app/api/packages/route.ts`](../../app/api/packages/route.ts), [`app/api/locations/route.ts`](../../app/api/locations/route.ts) POST handlers — all now wrap inside `prisma.$transaction(async (tx) => { ... })`.
**Still TODO:** PUT handlers (`app/api/destinations/[id]`, `app/api/packages/[id]`, `app/api/locations/[id]`) — verify same protection on update path.

### 🟠 1.2 Image rows can be deleted without removing the S3 object
**Where:** Anywhere `prisma.image.delete` is called without `deleteImageFromS3`.
**Symptom:** Storage cost creeps; orphan keys accumulate.
**Fix:** Always pair Prisma delete with `deleteImageFromS3(image.key)`. Consider a tiny `removeImage(id)` helper in `lib/services/imageService.ts` and route everything through it.

### 🟠 1.3 `Image` polymorphism is not enforced
The schema allows `destinationId`, `packageId`, `contentId`, `locationId` to all be set on a single row. App code assumes exactly one. No DB constraint backs that.
**Fix (option):** add a check constraint via migration:
```sql
ALTER TABLE "Image"
  ADD CONSTRAINT image_one_owner CHECK (
    (("destinationId" IS NOT NULL)::int +
     ("packageId" IS NOT NULL)::int +
     ("contentId" IS NOT NULL)::int +
     ("locationId" IS NOT NULL)::int) <= 1
  );
```

---

## 2. Type safety

### 🟠 2.1 `any` in API handlers
**Where:** [`app/api/destinations/route.ts`](../app/api/destinations/route.ts) — six `any` casts on `image`, `content`, `location` parameters inside `Promise.all` map callbacks. Other API routes have similar `body: any` patterns.
**Fix:** Define DTOs per endpoint (in `types/<entity>.ts` or co-located). Long term: introduce **Zod** schemas at the route boundary so we get parsed-and-typed bodies for free.

### 🟠 2.2 `error: any` in catch blocks
Pervasive. We lose narrowing and accidentally leak provider-specific error fields.
**Fix:** `catch (error) { const message = error instanceof Error ? error.message : "Unknown" ; ... }`. Never include `error.message` verbatim in user-facing 500 responses.

### 🟡 2.3 Inconsistent DTO source
Some endpoints destructure from `body: any`; some use `Prisma.DestinationCreateInput`. Pick one (DTOs at the edge, Prisma types internally) and migrate.

---

## 3. Duplicate / conflicting code

### 🟠 3.1 Two service trees
- [`lib/services/`](../lib/services/) — server-side orchestration (booking, payment, Viator).
- [`utils/service/`](../utils/service/) — browser axios wrappers per entity.

The two are intentionally different audiences but the naming is confusing. Document the split (already in [coding-standards.md](./coding-standards.md)) and resist creating a third location.

### 🟠 3.2 Stale top-level shims
- [`lib/bookingService.ts`](../../lib/bookingService.ts) — re-exports from `lib/services/bookingService.ts`. Audit confirms **zero importers** remain; safe to delete.
- [`lib/midtrans.ts`](../../lib/midtrans.ts) — re-exports from `lib/config/midtrans`. Audit confirms **zero importers**; safe to delete.
- [`lib/viatorMock.ts`](../../lib/viatorMock.ts) — **actively used** by `app/api/viator/checkout-session`, `app/api/viator/cart/book`, `app/api/viator/cart/hold`. Keep.
- [`proxy.ts`](../../proxy.ts) at repo root — **this IS the Next.js middleware entry**, despite the name. Build output shows `Proxy (Middleware)`. Renaming risks breaking middleware registration; leave as-is.

### 🟡 3.3 Loose scripts at repo root
- `scratch-viator.js` — ad-hoc test script with a hard-coded dummy API key. Move to `/scripts/` or delete.
- `get_slugs.ts` — one-off slug fetch. Same story.
- `test.html` (~47 KB) — purpose unclear; pre-Next.js artifact?

> Auditor confirmed all three have **zero references** in source. Deletion deferred — needs explicit user authorisation per /agent-rules.md §5.

---

## 4. Validation

### 🟠 4.1 No schema validation library
Manual `if (!field)` checks throughout. Easy to forget edge cases (empty strings, type coercion of "0", etc.).
**Fix:** introduce `zod` (already common with Next/Prisma) and start at the booking POST (highest blast radius).

### 🟠 4.2 Email/phone format not validated
`leadEmail` accepted as-is, `leadPhone` is free text. Outbound email may bounce silently.
**Fix:** validate at the route handler. For phone, accept E.164 (`+62...`).

### 🟠 4.3 Auth routes use `{ message }` shape, not canonical `{ error }`
**Where:** `app/api/auth/register`, `app/api/auth/forgot-password`, `app/api/auth/reset-password`, `app/api/auth/resend-verification`.
**Symptom:** Inconsistent with rest of API (which uses `{ error }`). Client form components (`LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`) read `data.message` to surface the toast.
**Fix:** Coordinated migration — update server **and** client in lockstep, or accept the divergence and document.
**Status:** Documented exception in [api-patterns.md §5.3](./api-patterns.md). Do not change server-side without UI fix.

---

## 5. Authentication & accounts

### 🟠 5.1 `EDITOR` role unused
The enum exists but no route distinguishes `EDITOR` from `USER`. Either implement editor permissions on `/dashboard/contents` or remove the enum value to avoid confusion.

### 🟠 5.2 Verification / reset tokens are single-use but not rate-limited
A user can request unlimited verification or password-reset emails. Add throttling per email + per IP.

### 🟡 5.3 Lockout window is global per user
60 s lockout after 3 attempts is short; brute-force across many emails is unmitigated. Add IP-level rate limiting for `/api/auth/[...nextauth]`.

---

## 6. Webhooks & idempotency

### 🟠 6.1 Webhook side effects are not transactional
On payment confirmation we update the booking, generate a ticket token, call Viator, and send an email. These are sequential; if email send fails, we still flip status. The user has no ticket.
**Fix:** make the email step idempotent and retryable. Persist `voucherEmailed=false` with retry counter, and have a cron retry the email send when `status=CONFIRMED && !voucherEmailed`.

### 🟠 6.2 No deduplication on webhook replays
Midtrans retries on failure. The handler should short-circuit if the booking has already reached the target status — partly done but worth auditing.

---

## 7. External calls

### 🟠 7.1 Viator failures fail closed
A 500 from Viator surfaces as 500 to the client. There is no fallback to mock or graceful "try again".
**Fix:** structured retries (e.g. 2 attempts, then user-facing "availability check failed, try again").

### 🟡 7.2 Hard-coded Viator config in `lib/data/viator.ts`
Blocked tag IDs, category groupings, display names — all hard-coded. Acceptable for now; revisit if business wants editorial control.

---

## 8. Storage

### 🟡 8.1 Cloudinary SDK installed but unused
[`utils/common/cloudinary.ts`](../utils/common/cloudinary.ts) configures Cloudinary. No call sites.
**Fix:** either delete the SDK + config, or wire it as a deliberate fallback path.

### 🟡 8.2 Vercel image optimization quota workaround
Commit `f48e677` ("reduce use ImageOptimize free plan vercel") added `unoptimized` on hot paths. This is a tier workaround, not a design choice. Remove when on a paid plan.

---

## 9. Build / dev experience

### 🟡 9.1 Stale Prisma cache on Turbopack
README documents the workaround (`rm -rf .next node_modules/.prisma node_modules/@prisma/client && npm install && npx prisma generate`). Consider scripting this as `npm run prisma:reset` so contributors can run one command.

### 🟡 9.2 No git hooks
No Husky / lint-staged. Lint and typecheck run only on demand and in CI (when configured).
**Fix:** add `prepare-commit-msg` or `pre-commit` hook for `eslint --max-warnings 0` on staged files.

---

## 10. Observability

### 🟠 10.1 No structured logging
Everything is `console.error`. Lost in Vercel logs at scale; impossible to alert on.
**Fix:** introduce a thin logger (Pino or even a wrapper) with severity + JSON. Long term: Sentry / Logtail / Axiom for prod.

### 🟠 10.2 No error tracking
Webhook failures, email send failures, S3 upload failures — all silent in production.

---

## 11. Testing

### 🔴 11.1 Zero automated tests
No unit, no integration, no E2E. All quality assurance is manual.
**Recommendation:** see [testing-strategy.md](./testing-strategy.md) for a phased adoption plan starting with the highest-risk surfaces (payment webhook, booking lifecycle, auth).

---

## 12. Performance

### 🟡 12.1 Admin lists fetch entire tables
Bookings, destinations, etc. paginate client-side. Fine at current scale; will hurt past a few thousand rows.
**Fix:** add server pagination per [api-patterns.md §10](./api-patterns.md).

### 🟡 12.2 React Query default cache
No global `staleTime` / `cacheTime` tuning. Mutations work because of explicit invalidations, but background refetch can overshoot for slow data.

---

## 13. Security

### ✅ 13.1 Logging leaks — RESOLVED
**Was:** `console.error("...", error)` patterns logged full axios error objects (incl. `error.config.headers` with auth keys). Some routes also returned `details: error.message` to clients.
**Status:** Bulk-sanitized across `app/api/**`. All `console.error("LABEL", error)` swapped to `console.error("LABEL", error instanceof Error ? error.message : "Unknown")`. All client-facing `details:` fields removed. Audit re-run shows no remaining leaks.
**Standing rule:** Per [coding-standards.md §11](./coding-standards.md), never log full error objects from axios / fetch — extract `.message` only.

### 🟠 13.2 `.env.local` checked into the workspace history?
`.env`, `.env.development`, `.env.local` were observed at the working copy with the same content. Verify `.gitignore` covers all of them and they are not in git history. Rotate all keys if any committed.

### 🟡 13.3 No CSP headers
`next.config.ts` does not set Content-Security-Policy or other security headers. Harmless but worth adding.

---

## 13.4 Provider isolation duplication (TourCMS) 🟠

The TourCMS integration mirrors the local Booking flow with its own tables (`TourcmsBooking`, `TourcmsBookingTraveler`), services (`tourcmsBookingService`, `tourcmsPostPaymentService`), and webhook (`/api/tourcms/payment/notification`). This was a deliberate isolation choice ([plan §3](../../../.claude/plans/tourcms-integration.md), constraint C1) to avoid touching the stable Viator path. Cost: duplication of post-payment email logic, status mapping, and idempotency handling.

**Revisit when:** a third provider is added, or both providers are stable enough to support a generic `bookingFinalizer<T>(provider, bookingId)` extracted into `lib/services/`. Don't refactor speculatively; let the duplication tell us when consolidation is worth it.

Also note: TourCMS uses a **separate Midtrans merchant** (`TOURCMS_MIDTRANS_*`). If the second merchant is decommissioned, see plan §10.4 Option B (multi-URL on a single merchant).

---

## 14. Cleanup checklist (good "while I'm here" wins)

- [ ] Delete `test.html`, `scratch-viator.js`, `get_slugs.ts` (or move to `/scripts/`). **Audit confirmed zero importers.** Awaiting user authorisation.
- [ ] Delete `lib/bookingService.ts` and `lib/midtrans.ts` re-export shims. **Audit confirmed zero importers.** Awaiting user authorisation.
- [ ] Remove unused Cloudinary SDK or wire it intentionally.
- [ ] Add `prisma:reset` npm script.
- [ ] Add a single `zod` schema for one route as a beachhead.
- [x] Wrap nested destination create in `$transaction` — done in destinations / packages / locations POST.
- [ ] Wrap PUT handlers (`destinations/[id]`, `packages/[id]`, `locations/[id]`) in `$transaction` too.
- [ ] Drop `EDITOR` enum value or implement its permissions.
- [ ] Sweep remaining `catch (error: any)` in payment, contents, retry, viator routes — switch to narrowing.
- [ ] Migrate `app/api/auth/*` shape from `{ message }` to `{ error }` (paired with UI updates).

---

## 15. Decision log (don't undo these)

| Decision | Why | Don't change unless… |
|---|---|---|
| `Float` for IDR amounts | Existing migrations rely on it; values are whole numbers in practice | …moving to a multi-currency aware domain — then switch to Decimal/cents. |
| No NextAuth Email magic-link provider | Brevo SMTP + custom verification preferred for branded emails | …customer base demands password-less. |
| Viator products not stored in DB | Avoid catalog drift; rely on live API | …offline display of product info becomes a requirement. |
| One Prisma singleton via `globalThis` | Survives Next.js HMR | …moving off serverless to long-lived Node process. |
| S3 over Cloudinary | Cost + control | …image transformation needs outgrow `<Image>`. |
| Mayar payment removed (`a99446c`) | Consolidating on Midtrans | …re-onboard a second gateway with explicit business case. |
