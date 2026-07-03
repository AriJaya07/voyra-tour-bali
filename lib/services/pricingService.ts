import { prisma } from "@/lib/prisma";
import {
  VIATOR_API_KEY,
  VIATOR_API_URL,
  VIATOR_HEADERS,
  VIATOR_MOCK_BOOKING,
  viatorSignal,
} from "@/lib/config/viator";

/**
 * Server-side price resolution for bookings.
 *
 * Client-supplied totals are NEVER trusted for products we can price from
 * our own DB (LOCAL-{slug} destinations, VTR-PKG-{id} packages). For live
 * Viator products we re-quote availability and flag large deviations
 * instead of blocking (fail-open: a flaky Viator API must not kill checkout).
 */

export class PricingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PricingError";
    this.status = status;
  }
}

export interface ResolvePriceInput {
  source: "local" | "viator" | "tourcms";
  productCode: string;
  pax: number;
  paxMix?: Array<{ ageBand: string; numberOfTravelers: number }> | null;
  travelDate: string;
  productOptionCode?: string | null;
  startTime?: string | null;
  clientTotal: number;
  currency: string;
}

export interface ResolvedPrice {
  /** Authoritative total in the booking currency (whole units). */
  totalPrice: number;
  /** True when the price came from a source we control (DB) or a live quote match. */
  verified: boolean;
  /** Where the price came from: destination | package | viator-quote | client-unverified */
  priceSource: string;
  /** True when a live quote existed and the client total deviated suspiciously. */
  suspicious: boolean;
}

const VIATOR_PRICE_TOLERANCE = 0.1; // 10% — absorbs FX rounding between quote and display

export function validateBookingBasics(input: {
  travelDate: string;
  pax: number;
  clientTotal: number;
}): void {
  const date = new Date(input.travelDate);
  if (Number.isNaN(date.getTime())) {
    throw new PricingError("Invalid travel date");
  }
  // travelDate is the calendar day in Bali (UTC+8) — compare against Bali "today"
  const baliNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const baliToday = new Date(
    Date.UTC(baliNow.getUTCFullYear(), baliNow.getUTCMonth(), baliNow.getUTCDate())
  );
  if (date.getTime() < baliToday.getTime()) {
    throw new PricingError("Travel date cannot be in the past");
  }
  const pax = Number(input.pax);
  if (!Number.isInteger(pax) || pax < 1 || pax > 50) {
    throw new PricingError("Invalid traveler count");
  }
  const total = Number(input.clientTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw new PricingError("Invalid total price");
  }
}

async function resolveLocalDestinationPrice(
  slug: string,
  pax: number
): Promise<ResolvedPrice> {
  const destination = await prisma.destination.findFirst({
    where: { slug },
    select: { price: true, title: true },
  });
  if (!destination) {
    throw new PricingError("Product not found", 404);
  }
  const unit = Math.round(Number(destination.price ?? 0));
  if (unit <= 0) {
    throw new PricingError("This tour is not currently bookable online", 409);
  }
  return {
    totalPrice: unit * pax,
    verified: true,
    priceSource: "destination",
    suspicious: false,
  };
}

async function resolvePackagePrice(id: number, pax: number): Promise<ResolvedPrice> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new PricingError("Product not found", 404);
  }
  const pkg = await prisma.package.findUnique({
    where: { id },
    select: { price: true },
  });
  if (!pkg) {
    throw new PricingError("Product not found", 404);
  }
  const unit = Math.round(Number(pkg.price));
  if (unit <= 0) {
    throw new PricingError("This package is not currently bookable online", 409);
  }
  return {
    totalPrice: unit * pax,
    verified: true,
    priceSource: "package",
    suspicious: false,
  };
}

/**
 * Re-quotes a live Viator product server-side and compares with the client
 * total. Never throws on Viator API failure — returns the client total
 * unverified so checkout keeps working; the caller decides what to do with
 * `suspicious`.
 */
async function resolveViatorPrice(input: ResolvePriceInput): Promise<ResolvedPrice> {
  const clientTotal = Math.round(Number(input.clientTotal));
  const unverified: ResolvedPrice = {
    totalPrice: clientTotal,
    verified: false,
    priceSource: "client-unverified",
    suspicious: false,
  };

  if (!VIATOR_API_KEY || VIATOR_MOCK_BOOKING) return unverified;

  try {
    const payload: Record<string, unknown> = {
      productCode: input.productCode,
      travelDate: input.travelDate,
      paxMix:
        input.paxMix && input.paxMix.length > 0
          ? input.paxMix
          : [{ ageBand: "ADULT", numberOfTravelers: input.pax }],
      currency: input.currency || "IDR",
    };
    if (input.productOptionCode) payload.productOptionCode = input.productOptionCode;

    const res = await fetch(`${VIATOR_API_URL}/availability/check`, {
      method: "POST",
      headers: VIATOR_HEADERS,
      signal: viatorSignal(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return unverified;

    const data = await res.json();
    const items: Array<{
      productOptionCode?: string;
      startTime?: string;
      available?: boolean;
      totalPrice?: { price?: { recommendedRetailPrice?: number } };
      lineItems?: Array<{ subtotalPrice?: { price?: { recommendedRetailPrice?: number } } }>;
    }> = Array.isArray(data?.bookableItems) ? data.bookableItems : [];
    if (items.length === 0) return unverified;

    const priceOf = (item: (typeof items)[number]) =>
      item.totalPrice?.price?.recommendedRetailPrice ||
      item.lineItems?.reduce(
        (sum, li) => sum + (li.subtotalPrice?.price?.recommendedRetailPrice || 0),
        0
      ) ||
      0;

    // Prefer the exact slot the user picked; fall back to any available slot.
    const match =
      items.find(
        (i) =>
          i.available !== false &&
          (!input.productOptionCode || i.productOptionCode === input.productOptionCode) &&
          (!input.startTime || i.startTime === input.startTime)
      ) || items.find((i) => i.available !== false);
    if (!match) return unverified;

    const quoted = Math.round(priceOf(match));
    if (quoted <= 0) return unverified;

    const deviation = Math.abs(clientTotal - quoted) / quoted;
    if (deviation <= VIATOR_PRICE_TOLERANCE) {
      return { totalPrice: quoted, verified: true, priceSource: "viator-quote", suspicious: false };
    }
    // Large mismatch: keep the client's (higher-of) price so we never
    // undercharge, and mark the booking for review.
    return {
      totalPrice: Math.max(clientTotal, quoted),
      verified: false,
      priceSource: "viator-quote-mismatch",
      suspicious: clientTotal < quoted,
    };
  } catch {
    return unverified;
  }
}

export async function resolveServerPrice(input: ResolvePriceInput): Promise<ResolvedPrice> {
  validateBookingBasics(input);

  if (input.productCode.startsWith("LOCAL-")) {
    return resolveLocalDestinationPrice(input.productCode.slice("LOCAL-".length), input.pax);
  }
  if (input.productCode.startsWith("VTR-PKG-")) {
    return resolvePackagePrice(Number(input.productCode.slice("VTR-PKG-".length)), input.pax);
  }
  if (input.source === "local") {
    // A "local" booking whose code we cannot resolve is not sellable.
    throw new PricingError("Product not found", 404);
  }
  return resolveViatorPrice(input);
}
