---
title: 14 · TDD Templates
updatedAt: 2026-05-01
---

# 14 · TDD Templates (Vitest + Playwright)

> Copy-paste skeletons matched to the spec patterns above. The repo currently has **no test framework installed** — pick one and these will be your first commits.

If you adopt Vitest + Playwright as suggested in [docs/testing-strategy.md](../docs/testing-strategy.md), this file is the bridge between specs and code.

---

## Install (one-time)

```bash
# Unit + integration
npm i -D vitest @vitest/coverage-v8 supertest @types/supertest

# E2E
npm i -D @playwright/test
npx playwright install --with-deps chromium

# Optional: a separate test DB
createdb voyra_test
```

`package.json` scripts to add:

```jsonc
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.ts", "**/*.test.ts"],
    coverage: { reporter: ["text", "html"], include: ["lib/**", "app/api/**"] },
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

`__tests__/setup.ts`:

```ts
import { afterEach, vi } from "vitest";

afterEach(() => vi.restoreAllMocks());

// Block real outbound HTTP unless a test opts in.
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST!;
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.MIDTRANS_SERVER_KEY = "test-key";
process.env.CRON_SECRET = "test-cron";
process.env.VIATOR_API_KEY = ""; // mock mode
process.env.NEXT_PUBLIC_VIATOR_MOCK_BOOKING = "true";
```

---

## Skeletons

### Unit — pure function

`utils/formatPrice.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatPrice } from "@/utils/formatPrice";

describe("formatPrice", () => {
  it("formats IDR with id-ID separators", () => {
    expect(formatPrice(1500000, "IDR")).toBe("Rp 1.500.000");
  });
  it("falls back gracefully on unknown currency", () => {
    expect(formatPrice(10, "XYZ")).toMatch(/10/);
  });
});
```

### Unit — service with Prisma mock

`lib/services/postPaymentService.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyAccount: { upsert: vi.fn() },
    loyaltyLedger: { findFirst: vi.fn(), create: vi.fn() },
    referral: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/email", () => ({ sendBookingConfirmation: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";
import { handlePaymentSuccess } from "@/lib/services/postPaymentService";

beforeEach(() => vi.clearAllMocks());

describe("handlePaymentSuccess", () => {
  it("is a no-op if voucher already emailed", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: 1, bookingRef: "B1", voucherEmailed: true, status: "CONFIRMED",
    });
    await handlePaymentSuccess(1);
    expect(sendBookingConfirmation).not.toHaveBeenCalled();
  });

  it("credits loyalty exactly once per refId", async () => {
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: 1, bookingRef: "B1", userId: 7, totalPrice: 1_000_000,
      voucherEmailed: false, status: "CONFIRMED", source: "local",
    });
    (prisma.loyaltyLedger.findFirst as any).mockResolvedValue(null);
    await handlePaymentSuccess(1);
    expect(prisma.loyaltyLedger.create).toHaveBeenCalledOnce();
  });
});
```

### Integration — route handler hit directly

`__tests__/integration/loyalty-redeem.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/loyalty/redeem/route";
import { prisma } from "@/lib/prisma";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: "1" } }),
}));

beforeEach(async () => {
  await prisma.loyaltyLedger.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.loyaltyAccount.create({ data: { userId: 1, pointsBalance: 5000 } });
});

const json = (body: any) =>
  new Request("http://localhost/api/loyalty/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/loyalty/redeem", () => {
  it("rejects non-1000 increments", async () => {
    const res = await POST(json({ points: 1500 }) as any);
    expect(res.status).toBe(400);
  });

  it("succeeds for 1000 pts", async () => {
    const res = await POST(json({ points: 1000 }) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.idrValue).toBe(50_000);
    expect(body.code).toMatch(/^VOYRA-1-/);

    const acc = await prisma.loyaltyAccount.findUnique({ where: { userId: 1 } });
    expect(acc?.pointsBalance).toBe(4000);

    const ledger = await prisma.loyaltyLedger.findMany({ where: { userId: 1 } });
    expect(ledger[0].reason).toBe("REDEEM");
  });
});
```

### Integration — Midtrans webhook with signature

`__tests__/integration/payment-notification.test.ts`:

```ts
import crypto from "node:crypto";
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/payment/notification/route";
import { prisma } from "@/lib/prisma";

const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;

const sign = (orderId: string, statusCode: string, gross: string) =>
  crypto.createHash("sha512").update(orderId + statusCode + gross + SERVER_KEY).digest("hex");

describe("POST /api/payment/notification", () => {
  it("rejects bad signature", async () => {
    const body = { order_id: "B1", status_code: "200", gross_amount: "1000.00", signature_key: "BAD", transaction_status: "settlement" };
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) as any);
    expect(res.status).toBe(403);
  });

  it("acknowledges valid settlement", async () => {
    const orderId = "B-TEST-" + Date.now();
    await prisma.booking.create({ data: {
      bookingRef: orderId, userId: 1, productCode: "X", productTitle: "Y",
      totalPrice: 1000, travelDate: new Date(), pax: 1, status: "PENDING",
    }});

    const body = {
      order_id: orderId, status_code: "200", gross_amount: "1000.00",
      transaction_status: "settlement",
      signature_key: sign(orderId, "200", "1000.00"),
    };
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) as any);
    expect(res.status).toBe(200);

    const after = await prisma.booking.findUnique({ where: { bookingRef: orderId } });
    expect(after?.status).toBe("CONFIRMED");
  });
});
```

### E2E — Playwright golden path

`e2e/booking-success.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("user books a tour with Midtrans sandbox (success)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@test.com");
  await page.getByLabel("Password").fill("pass1234");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/detail/VTR-BALI-1");
  await page.getByRole("button", { name: /book/i }).click();
  await page.fill("[name=guestName]", "Ari");
  await page.fill("[name=travelDate]", "2026-12-01");
  await page.getByRole("button", { name: /continue/i }).click();

  // Snap iframe — minimal smoke; full happy path requires Midtrans sandbox auto-fill
  await expect(page.frameLocator(".snap-popup")).toBeVisible({ timeout: 15_000 });
});
```

`e2e/compare.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("/compare renders 3 columns and supports remove", async ({ page }) => {
  await page.goto("/compare?codes=VTR-BALI-1,VTR-BALI-2,VTR-BALI-3");
  await expect(page.getByRole("heading", { name: /compare tours/i })).toBeVisible();
  await expect(page.locator(".grid > div")).toHaveCount(3);

  await page.locator("button[aria-label='Remove from compare']").first().click();
  await expect(page).toHaveURL(/codes=/);
  await expect(page.locator(".grid > div")).toHaveCount(2);
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
});
```

---

## Patterns to keep

- **Mock at the module boundary**, not deeper. `vi.mock("@/lib/prisma", ...)`, `vi.mock("nodemailer")`, `vi.mock("axios")`.
- **One test, one assertion** when realistic — easier to diagnose failures.
- **Fresh DB state per integration test** via `beforeEach` truncate + factory inserts.
- **Never share state between Playwright tests** — start each from a known signed-out cookie state.
- **Fixtures over factories with side-effects** — `__tests__/fixtures/midtransPayloads.ts` returning plain JSON beats class-based builders.
- **Coverage is a smoke detector**, not a target.

---

## Build verification

The test framework itself shouldn't break the production build:

```bash
npx tsc --noEmit
npx next build
```

If you co-locate `*.test.ts` files in `app/` or `lib/`, ensure your `next.config.ts` (or vitest config) doesn't accidentally include them in the Next bundle. Co-locate inside `__tests__/` until you hit a real reason otherwise.
