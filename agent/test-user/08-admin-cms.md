---
title: 08 · Admin CMS
updatedAt: 2026-05-01
---

# 08 · Admin CMS

## Goal

Admin (`User.role = "ADMIN"`) can manage operators, guides (CMS articles), tour-guide profiles, destinations, content, locations, images, reviews, subscribers, and Viator mock bookings. Every admin endpoint enforces role inside the handler — middleware doesn't run on `/api/**`.

## Surface area

| Concern | File |
|---|---|
| Layout | [app/dashboard/layout.tsx](../../app/dashboard/layout.tsx) |
| Index | [app/dashboard/page.tsx](../../app/dashboard/page.tsx) |
| Operators | [app/dashboard/operators/page.tsx](../../app/dashboard/operators/page.tsx), [app/api/admin/operators/route.ts](../../app/api/admin/operators/route.ts), [app/api/admin/operators/[id]/route.ts](../../app/api/admin/operators/%5Bid%5D/route.ts) |
| Guides (articles) | [app/dashboard/guides/page.tsx](../../app/dashboard/guides/page.tsx), [app/api/admin/guides/route.ts](../../app/api/admin/guides/route.ts), [app/api/admin/guides/[id]/route.ts](../../app/api/admin/guides/%5Bid%5D/route.ts) |
| Bookings | [app/dashboard/bookings/page.tsx](../../app/dashboard/bookings/page.tsx), [app/api/admin/bookings/](../../app/api/admin/bookings/) |
| Destinations | [app/dashboard/destinations/page.tsx](../../app/dashboard/destinations/page.tsx), [app/api/destinations/](../../app/api/destinations/) |
| Categories | [app/dashboard/categories/page.tsx](../../app/dashboard/categories/page.tsx), [app/api/categories/](../../app/api/categories/) |
| Contents | [app/dashboard/contents/page.tsx](../../app/dashboard/contents/page.tsx), [app/api/contents/](../../app/api/contents/) |
| Locations | [app/dashboard/locations/page.tsx](../../app/dashboard/locations/page.tsx), [app/api/locations/](../../app/api/locations/) |
| Groups | [app/dashboard/groups/page.tsx](../../app/dashboard/groups/page.tsx) |
| Images | [app/dashboard/images/page.tsx](../../app/dashboard/images/page.tsx), [app/api/images/route.ts](../../app/api/images/route.ts) |
| Viator-mock | [app/dashboard/viator-mock/page.tsx](../../app/dashboard/viator-mock/page.tsx), [app/dashboard/viator-mock/new/page.tsx](../../app/dashboard/viator-mock/new/page.tsx), [app/api/admin/mock-bookings/](../../app/api/admin/mock-bookings/) |
| Reviews | [app/dashboard/reviews/page.tsx](../../app/dashboard/reviews/page.tsx), [app/api/admin/reviews/](../../app/api/admin/reviews/) |
| Subscribers | [app/dashboard/subscribers/page.tsx](../../app/dashboard/subscribers/page.tsx), [app/api/admin/subscribers/](../../app/api/admin/subscribers/) |
| Operator-self apply (public) | [app/operator/apply/page.tsx](../../app/operator/apply/page.tsx) |
| Models | `Operator`, `Guide`, `TourGuide`, `Destination`, `Category`, `Content`, `Location`, `Image`, `MockBooking`, `Review`, `Subscription` |

## Preconditions

- A seeded admin user. Default seed: `admin@travel.com` / `admin123` ([prisma/seed.ts](../../prisma/seed.ts)).
- Middleware (`utils/common/middleware.ts`) gates `/dashboard` to ADMIN. **Each API still re-checks** role.

---

## Test cases

### TC-08-01 — Non-admin blocked from `/dashboard`

- USER role → middleware redirects to `/login` (or `/profile` per current rule).

### TC-08-02 — Operator approve / reject

- POST `/api/admin/operators` lists pending applications.
- PATCH `/api/admin/operators/[id]` `{ status: "APPROVED" }` → row updated. Email side-effect (welcome email) optional.
- PATCH with `{ status: "REJECTED", rejectReason }` requires `rejectReason`.
- PATCH with `{ status: "SUSPENDED" }` only valid from APPROVED.

### TC-08-03 — Operator UI flow

- `/dashboard/operators` shows list with status badges (PENDING / APPROVED / SUSPENDED / REJECTED), Approve / Reject / Suspend buttons. Optimistic refresh after action.

### TC-08-04 — Guides article CRUD

- POST `/api/admin/guides` `{ title, body, region?, tags?, status? }` → `201 Guide`. Slug auto-generated.
- PATCH `/api/admin/guides/[id]` `{ status: "PUBLISHED" }` → article appears at `/guides/<slug>`.
- DELETE `/api/admin/guides/[id]` → row removed.

### TC-08-05 — Destinations nested create

- POST `/api/destinations` with nested `images[], contents[], locations[]` → wrapped in `prisma.$transaction`. Partial failure rolls back.

### TC-08-06 — Image upload to S3

- POST `/api/images` (multipart). Object lands in S3 bucket. Row created in `Image` table with `key`, `url`, `altText`, `isMain`. Delete unlinks from S3 (`utils/common/s3.ts`).

### TC-08-07 — Mock bookings

- POST `/api/admin/mock-bookings` creates a `MockBooking` row used by the Viator mock layer when `VIATOR_MOCK_BOOKING=true`. Page list at `/dashboard/viator-mock` matches.

### TC-08-08 — Review moderation

- PATCH `/api/admin/reviews/[id]` `{ status: "APPROVED" | "REJECTED" }`. Approved reviews surface in public review components ([components/DetailProduct/ReviewsSection.tsx](../../components/DetailProduct/ReviewsSection.tsx)).

### TC-08-09 — Subscribers list

- GET `/api/admin/subscribers` returns email-only `Subscription` rows. Manual CSV export from the page is acceptable.

### TC-08-10 — All admin APIs reject non-admin in handler

- For each `/api/admin/**` route, an authenticated USER (not ADMIN) gets `403`. No middleware shortcut.

### TC-08-11 — Layout uses dashboard shell

- `/dashboard/*` pages render without the public Navbar / Footer / MobileBottomNav (controlled by [LayoutWrapper.tsx](../../components/Wrapper/LayoutWrapper.tsx) `isDashboard` branch).

---

## Manual QA checklist

- [ ] Sign in as admin → `/dashboard` reachable
- [ ] Sign in as user → `/dashboard` redirects away
- [ ] Apply as operator from `/operator/apply` → row appears in `/dashboard/operators` PENDING
- [ ] Approve → status flips, badge green
- [ ] Reject with reason → reason recorded
- [ ] Create a guide article → publish → visible on `/guides/<slug>`
- [ ] Delete the guide article → 404 on public URL
- [ ] Create a destination with 3 images → public detail page renders nested
- [ ] Upload an image → object exists at the S3 URL the API returned
- [ ] Approve a pending review → appears in detail page reviews block
- [ ] Subscribers count visible; export CSV manually

## Third-party / local response checklist

| Surface | Provider | Expect |
|---|---|---|
| `Operator` row | local | `{ id, name, slug, status: "PENDING|APPROVED|SUSPENDED|REJECTED", licenseNo, insurance, rejectReason?, ownerUserId }` |
| `Guide` (article) row | local | `{ id, title, slug, body, region?, tags[], status: "DRAFT|PUBLISHED", publishedAt?, views, coverImage? }` |
| `Image` row | local | `{ id, key, url, altText?, isMain, order, ... }` |
| S3 object | AWS | HTTP 200 on `https://{bucket}.s3.{region}.amazonaws.com/{key}` |

## Failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| Admin route returns 200 to non-admin | role check missing in handler | add `if (session.user.role !== "ADMIN") return 403` |
| S3 upload 403 | bucket policy missing `s3:PutObject` for the IAM user | tighten/loosen policy |
| Image link in admin form returns 403 | bucket public-read missing or signed URL expired | switch to public-read with CloudFront fronting |
| Approving operator 500 | Prisma `update` on row that no longer exists | guard with `findUnique` first |

## Build verification

```bash
npx tsc --noEmit
npx next build
```

All `/dashboard/**` and `/api/admin/**` routes appear in build output.
