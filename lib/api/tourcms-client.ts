import { XMLParser, XMLBuilder } from "fast-xml-parser";

import {
  TOURCMS_API_URL,
  TOURCMS_COUNTRY_ISO,
  TOURCMS_DEFAULT_CHANNEL,
  TOURCMS_GEO_FILTER,
  TOURCMS_GEO_LAT,
  TOURCMS_GEO_LONG,
  TOURCMS_GEO_RADIUS_KM,
  buildTourcmsAuthHeader,
  tourcmsSignal,
} from "@/lib/config/tourcms";
import {
  TourcmsApiError,
  type TourcmsAvailabilityResult,
  type TourcmsAvailabilitySlot,
  type TourcmsBookingListItem,
  type TourcmsBookingOptions,
  type TourcmsCancelResult,
  type TourcmsCommitResult,
  type TourcmsCustomerAck,
  type TourcmsHold,
  type TourcmsListResult,
  type TourcmsListing,
  type TourcmsPaxMixEntry,
  type TourcmsProductDetail,
  type TourcmsStartBookingInput,
} from "@/types/tourcms";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
  attributeNamePrefix: "@_",
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  format: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: false,
});

function asArray<T>(input: T | T[] | undefined | null): T[] {
  if (input == null) return [];
  return Array.isArray(input) ? input : [input];
}

function pickStr(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

function pickNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

function slugify(name: string, channelId: number, tourId: number): string {
  const safe = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${channelId}-${tourId}-${safe || "tour"}`;
}

async function callTourcms<T = unknown>(opts: {
  channelId: number;
  verb: "GET" | "POST";
  pathWithQuery: string;
  body?: string;
}): Promise<T> {
  const url = `${TOURCMS_API_URL}${opts.pathWithQuery}`;
  const headers: Record<string, string> = {
    Accept: "application/xml",
    "Content-Type": 'text/xml;charset="utf-8"',
    ...buildTourcmsAuthHeader({
      channelId: opts.channelId,
      verb: opts.verb,
      pathWithQuery: opts.pathWithQuery,
    }),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.verb,
      headers,
      body: opts.verb === "POST" ? opts.body : undefined,
      signal: tourcmsSignal(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    throw new TourcmsApiError(msg, "TOURCMS_NETWORK", 502);
  }

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      console.error(
        `[TourCMS] 401 Unauthorized signing channel=${opts.channelId} path=${opts.pathWithQuery}. ` +
          `Likely causes: (1) /p/* must sign with channel=0, (2) account not subscribed to that channel, ` +
          `(3) clock skew >300s, (4) wrong TOURCMS_PRIVATE_KEY.`
      );
    }
    throw new TourcmsApiError(
      `Upstream ${res.status}`,
      "TOURCMS_HTTP",
      res.status >= 500 ? 502 : res.status
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(text) as Record<string, unknown>;
  } catch {
    throw new TourcmsApiError("Invalid XML from upstream", "TOURCMS_XML", 502);
  }

  const root = (parsed.response ??
    parsed[Object.keys(parsed)[0] || ""]) as Record<string, unknown> | undefined;
  const benignStatuses = new Set([
    "OK",
    "NO DATA CHANGED",
    "NO MATCHING DATA",
    "NO RESULTS",
  ]);
  if (root && typeof root === "object") {
    const error = (root as Record<string, unknown>).error;
    if (
      error != null &&
      typeof error === "string" &&
      !benignStatuses.has(error.toUpperCase())
    ) {
      throw new TourcmsApiError(error, "TOURCMS_API", 502);
    }
  }

  return (root ?? parsed) as T;
}

function mapTourElementToListing(
  tourEl: Record<string, unknown>
): TourcmsListing {
  const channelId = Number(pickNum(tourEl.channel_id, tourEl.channelid) ?? 0);
  const tourId = Number(pickNum(tourEl.tour_id, tourEl.id) ?? 0);
  const title = pickStr(tourEl.tour_name, tourEl.tour, tourEl.name) || "Tour";
  const imageEl = (tourEl.images as { image?: unknown } | undefined)?.image;
  const firstImg = Array.isArray(imageEl) ? imageEl[0] : imageEl;
  const imageUrl = pickStr(
    tourEl.thumbnail_image,
    tourEl.tour_image_thumb,
    tourEl.tour_image,
    (firstImg as Record<string, unknown> | undefined)?.url_thumbnail,
    (firstImg as Record<string, unknown> | undefined)?.url
  );
  const fromPrice = pickNum(tourEl.from_price, tourEl.start_price);
  const currencyCode = pickStr(tourEl.currency, tourEl.tour_currency, tourEl.sale_currency);
  const durationText = pickStr(tourEl.duration, tourEl.duration_text);
  const productCode = `${channelId}:${tourId}`;
  return {
    productCode,
    channelId,
    tourId,
    title,
    slug: slugify(title, channelId, tourId),
    imageUrl,
    thumbnailUrl: imageUrl,
    shortDescription: pickStr(tourEl.short_description, tourEl.summary),
    fromPrice,
    currencyCode,
    durationText,
    city: pickStr(tourEl.city, tourEl.tour_city, tourEl.location),
    country: pickStr(tourEl.country, tourEl.tour_country),
    rating: pickNum(tourEl.review_rating_average, tourEl.rating),
    reviewCount: pickNum(tourEl.review_count, tourEl.reviews),
  };
}

export async function searchTours(opts: {
  q?: string;
  categoryId?: number;
  page?: number;
  pageSize?: number;
  channelId?: number;
}): Promise<TourcmsListResult> {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.max(1, Math.min(200, opts.pageSize || 24));
  const params = new URLSearchParams();
  if (opts.q) params.set("k", opts.q);
  if (opts.categoryId) params.set("category", String(opts.categoryId));
  params.set("per_page", String(pageSize));
  params.set("page", String(page));

  if (TOURCMS_GEO_FILTER === "bali" || TOURCMS_GEO_FILTER === "custom") {
    params.set("lat", String(TOURCMS_GEO_LAT));
    params.set("long", String(TOURCMS_GEO_LONG));
    params.set("geo_distance", String(TOURCMS_GEO_RADIUS_KM));
    params.set("geo_unit", "km");
    if (TOURCMS_COUNTRY_ISO) params.set("country", TOURCMS_COUNTRY_ISO);
  }

  // /p/* (marketplace) endpoints MUST be signed with channel=0 per official
  // PHP client. /c/* (channel-scoped) requires the operator's channel id.
  const sigChannel =
    opts.channelId && opts.channelId > 0 ? opts.channelId : 0;
  const isMarketplace = sigChannel === 0;
  const path = isMarketplace
    ? `/p/tours/search.xml?${params.toString()}`
    : `/c/tours/search.xml?${params.toString()}`;
  const data = await callTourcms<Record<string, unknown>>({
    channelId: sigChannel,
    verb: "GET",
    pathWithQuery: path,
  });

  const total = Number(
    pickNum((data as Record<string, unknown>).total_tour_count) ?? 0
  );
  const tours = asArray<Record<string, unknown>>(
    (data as Record<string, unknown>).tour as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined
  );
  const items = tours.map(mapTourElementToListing);
  return { items, total, page, pageSize };
}

export async function showTour(opts: {
  channelId: number;
  tourId: number;
}): Promise<TourcmsProductDetail | null> {
  const path = `/c/tour/show.xml?id=${opts.tourId}`;
  const data = await callTourcms<Record<string, unknown>>({
    channelId: opts.channelId || TOURCMS_DEFAULT_CHANNEL,
    verb: "GET",
    pathWithQuery: path,
  });

  const tour = (data.tour ?? data) as Record<string, unknown>;
  if (!tour || !tour.tour_id) return null;

  const listing = mapTourElementToListing(tour);
  const imagesRaw = asArray<Record<string, unknown>>(
    (tour.images as Record<string, unknown> | undefined)?.image as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined
  );
  const images = imagesRaw
    .map((i) => ({
      url: pickStr(i.url, i.url_thumbnail) || "",
      alt: pickStr(i.image_desc, i.image_description, i.alt),
    }))
    .filter((i) => !!i.url);

  return {
    ...listing,
    description: pickStr(tour.long_description, tour.description, tour.summary),
    highlights: asArray<string>(
      (tour.highlights as { item?: string | string[] } | undefined)?.item as
        | string
        | string[]
        | undefined
    ),
    inclusions: asArray<string>(
      (tour.inclusions as { item?: string | string[] } | undefined)?.item as
        | string
        | string[]
        | undefined
    ),
    exclusions: asArray<string>(
      (tour.exclusions as { item?: string | string[] } | undefined)?.item as
        | string
        | string[]
        | undefined
    ),
    meetingPoint: pickStr(tour.start_location, tour.meeting_point, tour.location),
    images:
      images.length > 0
        ? images
        : listing.imageUrl
          ? [{ url: listing.imageUrl, alt: listing.title }]
          : [],
    ageBands: ["ADULT", "CHILD"],
  };
}

function mapAvailabilityNode(
  el: Record<string, unknown>,
  fallbackCurrency: string
): TourcmsAvailabilitySlot {
  return {
    componentKey:
      pickStr(el.component_key, el.componentKey, el.book_key) || "",
    rateId: pickStr(el.rate_id, el.id, el.code),
    startTime: pickStr(el.start_time, el.time),
    available:
      pickStr(el.status)?.toUpperCase() !== "SOLDOUT" &&
      Number(pickNum(el.spaces_remaining) ?? 1) > 0,
    totalPrice: Number(
      pickNum(el.total_price, el.price_total, el.price_1, el.price_2) ?? 0
    ),
    currencyCode: pickStr(el.sale_currency, el.currency) || fallbackCurrency,
    rateName: pickStr(el.rate_name, el.name, el.rate_type),
    spacesRemaining: pickNum(el.spaces_remaining),
  };
}

export async function checkAvailability(opts: {
  channelId: number;
  tourId: number;
  date: string;
  paxMix?: TourcmsPaxMixEntry[];
}): Promise<TourcmsAvailabilityResult> {
  const params = new URLSearchParams();
  params.set("id", String(opts.tourId));
  params.set("date", opts.date);
  if (opts.paxMix?.length) {
    const adults =
      opts.paxMix.find((p) => p.ageBand === "ADULT")?.numberOfTravelers ?? 0;
    const children =
      opts.paxMix.find((p) => p.ageBand === "CHILD")?.numberOfTravelers ?? 0;
    if (adults) params.set("adults", String(adults));
    if (children) params.set("children", String(children));
  }
  const path = `/c/tour/datesprices/checkavail.xml?${params.toString()}`;
  const data = await callTourcms<Record<string, unknown>>({
    channelId: opts.channelId || TOURCMS_DEFAULT_CHANNEL,
    verb: "GET",
    pathWithQuery: path,
  });

  const componentsRoot =
    (data.components as Record<string, unknown> | undefined) ||
    (data.availability as Record<string, unknown> | undefined) ||
    (data.dates_and_prices as Record<string, unknown> | undefined);
  const nodes = asArray<Record<string, unknown>>(
    (componentsRoot?.component as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | undefined) ??
      (componentsRoot?.date as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined)
  );
  const fallbackCurrency = pickStr(data.currency, data.sale_currency) || "USD";
  const slots = nodes.map((n) => mapAvailabilityNode(n, fallbackCurrency));

  return {
    available: slots.some((s) => s.available && s.componentKey),
    productCode: `${opts.channelId}:${opts.tourId}`,
    travelDate: opts.date,
    slots,
    currencyCode: slots[0]?.currencyCode ?? fallbackCurrency,
  };
}

export async function checkOptions(opts: {
  channelId: number;
  tourId: number;
  date: string;
  paxMix: TourcmsPaxMixEntry[];
}): Promise<TourcmsBookingOptions> {
  const result = await checkAvailability(opts);
  return {
    productCode: result.productCode,
    travelDate: result.travelDate,
    options: result.slots,
  };
}

export async function startBooking(
  input: TourcmsStartBookingInput
): Promise<TourcmsHold> {
  if (!input.componentKey) {
    throw new TourcmsApiError(
      "componentKey required for start_new",
      "TOURCMS_INPUT",
      400
    );
  }

  const customers = (input.travelers || []).map((t, i) => ({
    customer: {
      firstname: t.firstName || (i === 0 ? input.bookerInfo.firstName : ""),
      surname: t.lastName || (i === 0 ? input.bookerInfo.lastName : ""),
      ...(i === 0
        ? { email: input.bookerInfo.email, phone: input.bookerInfo.phone }
        : {}),
    },
  }));

  const bookingObj: Record<string, unknown> = {
    booking: {
      total_customers: input.totalCustomers,
      components: {
        component: {
          component_key: input.componentKey,
        },
      },
    },
  };

  if (customers.length > 0) {
    (bookingObj.booking as Record<string, unknown>).customers =
      customers.length === 1
        ? customers[0]
        : { customer: customers.map((c) => c.customer) };
  }

  const body = `<?xml version="1.0"?>${xmlBuilder.build(bookingObj)}`;

  const path = `/c/booking/new/start.xml`;
  const data = await callTourcms<Record<string, unknown>>({
    channelId: input.channelId,
    verb: "POST",
    pathWithQuery: path,
    body,
  });

  const booking = (data.booking ?? data) as Record<string, unknown>;
  const tourcmsHoldId = pickStr(
    booking.booking_id,
    booking.id,
    data.booking_id
  );
  if (!tourcmsHoldId) {
    throw new TourcmsApiError(
      "TourCMS start_new returned no booking_id",
      "TOURCMS_HOLD",
      502
    );
  }

  const customersRoot = booking.customers as Record<string, unknown> | undefined;
  const firstCustomer = asArray<Record<string, unknown>>(
    customersRoot?.customer as Record<string, unknown> | undefined
  )[0];
  const customerId = pickStr(firstCustomer?.customer_id, firstCustomer?.id);

  const holdSeconds = Number(
    pickNum(booking.hold_time_seconds, booking.hold_seconds) ?? 2700
  );
  const expiresAt = new Date(Date.now() + holdSeconds * 1000).toISOString();

  return {
    channelId: input.channelId,
    tourcmsHoldId,
    customerId,
    expiresAt,
  };
}

export async function updateCustomer(opts: {
  channelId: number;
  customerId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}): Promise<TourcmsCustomerAck> {
  const customer: Record<string, unknown> = { customer_id: opts.customerId };
  if (opts.firstName) customer.firstname = opts.firstName;
  if (opts.lastName) customer.surname = opts.lastName;
  if (opts.email) customer.email = opts.email;
  if (opts.phone) customer.phone = opts.phone;

  const body = `<?xml version="1.0"?>${xmlBuilder.build({ customer })}`;
  const path = `/c/customer/update.xml`;
  await callTourcms<Record<string, unknown>>({
    channelId: opts.channelId,
    verb: "POST",
    pathWithQuery: path,
    body,
  });
  return { success: true };
}

export async function commitBooking(opts: {
  channelId: number;
  tourcmsHoldId: string;
  agentRef?: string;
  suppressEmail?: boolean;
}): Promise<TourcmsCommitResult> {
  const bookingFields: Record<string, unknown> = {
    booking_id: opts.tourcmsHoldId,
  };
  if (opts.agentRef) bookingFields.agent_ref = opts.agentRef;
  if (opts.suppressEmail) bookingFields.suppress_email = 1;

  const body = `<?xml version="1.0"?>${xmlBuilder.build({ booking: bookingFields })}`;

  const path = `/c/booking/new/commit.xml`;
  try {
    const data = await callTourcms<Record<string, unknown>>({
      channelId: opts.channelId,
      verb: "POST",
      pathWithQuery: path,
      body,
    });
    const booking = (data.booking ?? data) as Record<string, unknown>;
    const ref = pickStr(
      booking.booking_id,
      booking.booking_uuid,
      booking.reference
    );
    const status = pickStr(booking.status);
    const isConfirmed = status === "2" || status === "1" || !!ref;
    return {
      success: !!ref && isConfirmed,
      tourcmsBookingRef: ref,
      voucherUrl: pickStr(booking.voucher_url),
      error: ref ? null : "Missing booking reference in commit response",
    };
  } catch (err) {
    return {
      success: false,
      tourcmsBookingRef: null,
      voucherUrl: null,
      error: err instanceof Error ? err.message : "Unknown",
    };
  }
}

export async function cancelBooking(opts: {
  channelId: number;
  tourcmsBookingRef: string;
  reason?: string;
  cancelReasonCode?: number;
}): Promise<TourcmsCancelResult> {
  const bookingObj = {
    booking: {
      booking_id: opts.tourcmsBookingRef,
      cancel_reason: opts.cancelReasonCode ?? 22,
      ...(opts.reason ? { note: opts.reason } : {}),
    },
  };
  const body = `<?xml version="1.0"?>${xmlBuilder.build(bookingObj)}`;
  const path = `/c/booking/cancel.xml`;
  try {
    await callTourcms<Record<string, unknown>>({
      channelId: opts.channelId,
      verb: "POST",
      pathWithQuery: path,
      body,
    });
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown",
    };
  }
}

export async function listBookings(opts: {
  channelId: number;
  modifiedSince?: string;
  perPage?: number;
}): Promise<TourcmsBookingListItem[]> {
  const params = new URLSearchParams();
  if (opts.modifiedSince) params.set("made_date_start", opts.modifiedSince);
  params.set("per_page", String(opts.perPage ?? 100));

  const sigChannel =
    opts.channelId && opts.channelId > 0 ? opts.channelId : 0;
  const isMarketplace = sigChannel === 0;
  const path = isMarketplace
    ? `/p/bookings/list.xml?${params.toString()}`
    : `/c/bookings/list.xml?${params.toString()}`;

  const data = await callTourcms<Record<string, unknown>>({
    channelId: sigChannel,
    verb: "GET",
    pathWithQuery: path,
  });

  const root = data.bookings as Record<string, unknown> | undefined;
  const bookings = asArray<Record<string, unknown>>(
    root?.booking as Record<string, unknown> | undefined
  );
  return bookings.map((b) => ({
    bookingRef: pickStr(b.booking_id, b.booking_uuid, b.reference) || "",
    status: pickStr(b.status) || "UNKNOWN",
    modifiedDate:
      pickStr(b.last_modified, b.modified_date, b.booking_modified) || "",
  }));
}

export const tourcmsClient = {
  searchTours,
  showTour,
  checkAvailability,
  checkOptions,
  startBooking,
  updateCustomer,
  commitBooking,
  cancelBooking,
  listBookings,
};
