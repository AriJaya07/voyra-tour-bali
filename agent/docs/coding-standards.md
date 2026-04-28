# Coding Standards — Voyra Tour Bali

> Style, naming, and patterns to follow (or avoid) so new code matches the rest of the repo.

---

## 1. Language & Compiler

- **TypeScript**, `strict: true` (`tsconfig.json`).
- Target `ES2017`, JSX `react-jsx`, `isolatedModules: true`, `noEmit: true`.
- Path alias: **`@/*` → repo root**. Always use it; do not use deep relative paths.
  ```ts
  // ✅ good
  import { prisma } from "@/lib/prisma";
  // ❌ avoid
  import { prisma } from "../../../lib/prisma";
  ```
- ESLint v9 flat config extends `next/core-web-vitals` + `next/typescript` + `eslint-config-prettier`. Run `npm run lint` before committing.

---

## 2. File & Folder Naming

| Kind | Convention | Example |
|---|---|---|
| React component file | `PascalCase.tsx` | `DestinationForm.tsx`, `AIChatWidget.tsx` |
| Route handler | literal `route.ts` | `app/api/destinations/route.ts` |
| Page | literal `page.tsx` | `app/dashboard/page.tsx` |
| Layout | literal `layout.tsx` | `app/layout.tsx` |
| Service (browser axios wrapper) | `<entity>.service.ts` | `utils/service/destination.service.ts` |
| Service (server orchestration) | `camelCaseService.ts` | `lib/services/bookingService.ts` |
| Hook | `use<Thing>.ts` | `utils/hooks/useDestinations.ts` |
| Type module | `<entity>.ts` | `types/booking.ts` |
| Util | `camelCase.ts` | `utils/formatPrice.ts` |
| Folder under `app/` | `kebab-case` | `app/booking-success`, `app/cancellation-policy` |
| Folder under `components/` | `PascalCase` for feature areas, `lowercase` for ad-hoc groups | `components/Dashboard/`, `components/booking/` |

Dynamic segments use brackets: `app/api/destinations/[id]/route.ts`. Catch-all auth: `app/api/auth/[...nextauth]/route.ts`.

---

## 3. Imports

Order (enforced by habit, not lint rule):

1. Node / external packages (`react`, `next/...`, `next-auth`, `@prisma/client`, …).
2. Internal absolute (`@/lib`, `@/utils`, `@/components`, `@/types`).
3. Relative siblings (rare — prefer `@/`).
4. Style / asset imports last.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/utils/common/auth";
import type { BookingStatus } from "@prisma/client";
```

---

## 4. React Components

- **Server by default.** Add `"use client"` only when you need: state, effects, browser APIs, NextAuth `useSession`, React Query, or event handlers.
- One component per file. Default export the main component:
  ```tsx
  export default function DestinationForm({ ... }: Props) { ... }
  ```
- Props typed inline as `Props` interface above the component:
  ```tsx
  interface Props { destinationId: number; onSaved?: () => void; }
  ```
- Co-locate small subcomponents only if used **once**; otherwise lift into the same folder.
- Never import server-only libs (`prisma`, `nodemailer`, `aws-sdk`) into client components.

---

## 5. Hooks Pattern (React Query)

Every entity has a hook in `utils/hooks/use<Entity>.ts` that returns the query + all mutations. Keep this shape — admin tables/forms depend on it.

```ts
// utils/hooks/useDestinations.ts (canonical shape)
export function useDestinations() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["destinations"],
    queryFn: destinationService.getAll,
  });

  const createMut = useMutation({
    mutationFn: destinationService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["destinations"] }),
  });

  // ... updateMut, deleteMut

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createDestination: createMut.mutate,
    creating: createMut.isPending,
    updateDestination: updateMut.mutate,
    updating: updateMut.isPending,
    deleteDestination: deleteMut.mutate,
    deleting: deleteMut.isPending,
  };
}
```

Rules:

- **Query key = `["<entity>"]`** (string array). Add filters as extra key parts: `["destinations", { categoryId }]`.
- **Always invalidate** the matching key inside `onSuccess`. Never call `setQueryData` unless the optimistic flow is required.
- Surface `isPending` from each mutation as `creating` / `updating` / `deleting` — UI binds to those flags for disabling buttons.

---

## 6. Service Layer

Two layers, two purposes — do not mix:

### 6.1 Browser service (`utils/service/<entity>.service.ts`)
Thin wrapper over axios. One function per HTTP verb. Returns `response.data`. Used by hooks.

```ts
// utils/service/destination.service.ts
import { api } from "@/lib/axios";
export const destinationService = {
  getAll: async () => (await api.get("/destinations")).data,
  getById: async (id: number) => (await api.get(`/destinations/${id}`)).data,
  create: async (payload: CreateDestinationDto) =>
    (await api.post("/destinations", payload)).data,
  update: async (id: number, payload: UpdateDestinationDto) =>
    (await api.put(`/destinations/${id}`, payload)).data,
  delete: async (id: number) => (await api.delete(`/destinations/${id}`)).data,
};
```

### 6.2 Server service (`lib/services/<name>Service.ts`)
Orchestrates Prisma + outbound APIs. Pure functions where possible. No HTTP request/response — accepts plain inputs, returns plain outputs. Route handlers compose these.

```ts
// lib/services/postPaymentService.ts
export async function handlePaymentSuccess(bookingId: number) { ... }
```

Don't put HTTP `req`/`res` parsing here — that belongs in the route handler.

---

## 7. Route Handlers

See [api-patterns.md](./api-patterns.md) for the full template. Key conventions:

- One handler per HTTP verb: `export async function GET/POST/PATCH/PUT/DELETE`.
- Always wrap body in `try/catch`. On error: `return NextResponse.json({ error: "..." }, { status })`.
- Auth check first (where required): `getServerSession(authOptions)` → `if (!session) return 401`.
- Validate required fields explicitly. Return `400` with `{ error: "<field> required" }`.
- Return `201` on create, `200` on read/update, `204` (or `200 { ok: true }`) on delete.
- Log errors with `console.error("Error <verb>ing <entity>:", error)` — that's the prevailing format and grep-friendly.

---

## 8. Database (Prisma)

- Always import the singleton: `import { prisma } from "@/lib/prisma";`. **Never `new PrismaClient()` outside `lib/prisma.ts`.**
- For multi-step writes that must succeed atomically, **use `prisma.$transaction([...])`** instead of `Promise.all`. The current destinations POST is a known offender — match the atomic pattern in new code.
- Always include relations explicitly via `include: { ... }`. Don't rely on lazy fetching.
- For schema changes:
  1. Edit `prisma/schema.prisma`.
  2. `npx prisma migrate dev --name <descriptive_name>` locally.
  3. Commit the generated migration files.
  4. `npx prisma migrate deploy` runs in production.

---

## 9. Styling (Tailwind v4)

- Tailwind classes inline on JSX. No CSS modules, no styled-components.
- Use `clsx` for conditional classes:
  ```tsx
  import clsx from "clsx";
  <button className={clsx("rounded px-4 py-2", disabled && "opacity-50")} />
  ```
- Global styles only in `app/globals.css`. Don't add new global CSS files.
- Animations: prefer `framer-motion` for declarative motion, plain CSS transitions for hover/focus.

---

## 10. Types

- Domain types for browser code live in `types/` (`booking.ts`, `tourism.ts`, `blog.ts`, etc.).
- For Prisma models, **import directly from `@prisma/client`** — don't re-declare:
  ```ts
  import type { Booking, BookingStatus, User } from "@prisma/client";
  ```
- Avoid `any`. When unavoidable (third-party untyped JSON), narrow to `unknown` and validate at the edge. Drop-in `any` is technical debt — don't ship new ones.
- DTOs (request/response shapes) live next to the route in a comment or in `types/<entity>.ts` if shared.

---

## 11. Errors & Logging

- `console.error("Error <action>:", error)` for server-side failures.
- `sonner.toast.error("Human-readable message")` for client-side feedback. Never expose raw error messages from the API to the user — the message in `{ error }` is safe; stack traces are not.
- Never `throw` from a route handler — always `return NextResponse.json({ error }, { status })`.
- Never `console.log` secrets, tokens, snapToken, paymentId, or PII (email, phone).

---

## 12. Comments

Default: **no comments**. Names should explain intent.

Add a comment only when the **why** is non-obvious:

- A workaround for a bug or quirk (Vercel free-tier image optimization, Viator quirk, Midtrans signature ordering).
- A subtle invariant (`travelDate` must be in UTC, `totalPrice` must be integer IDR).
- A security note (signature verification, lockout window).

Don't comment what the code already says (`// fetch user`).

---

## 13. Forbidden / Avoid

- ❌ `prisma` import in client components.
- ❌ Hard-coded secrets in source. Always `process.env.X`.
- ❌ `Promise.all` for dependent writes (use transactions).
- ❌ Server-side `fetch` without `AbortSignal.timeout(...)` for outbound APIs.
- ❌ `any` in new code (existing offenders flagged in [tech-debt.md](./tech-debt.md)).
- ❌ Direct DOM manipulation (`document.querySelector`) — use refs.
- ❌ Inline styles via `style={{...}}` unless dynamic value not expressible in Tailwind.
- ❌ `useEffect` for data fetching — use React Query.

---

## 14. Encouraged

- ✅ Server components for SEO surfaces.
- ✅ React Query for server state, Zustand for ephemeral cross-component state.
- ✅ `clsx` + Tailwind for conditional UI.
- ✅ `prisma.$transaction([...])` for multi-write flows.
- ✅ Narrow types at trust boundaries (request bodies, third-party payloads).
- ✅ Centralised env access via `lib/config/*` rather than scattering `process.env.*`.

---

## 15. PR Checklist (mental)

- [ ] No `any` introduced.
- [ ] Lint passes (`npm run lint`).
- [ ] Build passes (`npm run build`).
- [ ] No `console.log` left behind (use `console.error` for genuine errors).
- [ ] Migration committed alongside `schema.prisma` change.
- [ ] React Query keys invalidated on mutations.
- [ ] Auth check present on protected routes.
- [ ] No secrets in diff.
