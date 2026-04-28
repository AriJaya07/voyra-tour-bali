export interface TourcmsPaxMixEntry {
  ageBand: string;
  numberOfTravelers: number;
}

export interface TourcmsListing {
  productCode: string;
  channelId: number;
  tourId: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  shortDescription: string | null;
  fromPrice: number | null;
  currencyCode: string | null;
  durationText: string | null;
  city: string | null;
  country: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export interface TourcmsListResult {
  items: TourcmsListing[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TourcmsProductDetail extends TourcmsListing {
  description: string | null;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  meetingPoint: string | null;
  images: { url: string; alt: string | null }[];
  ageBands: string[];
}

export interface TourcmsAvailabilitySlot {
  componentKey: string;
  rateId: string | null;
  startTime: string | null;
  available: boolean;
  totalPrice: number;
  currencyCode: string;
  rateName: string | null;
  spacesRemaining: number | null;
}

export interface TourcmsAvailabilityResult {
  available: boolean;
  productCode: string;
  travelDate: string;
  slots: TourcmsAvailabilitySlot[];
  currencyCode: string;
  _mock?: boolean;
}

export interface TourcmsQuoteLineItem {
  ageBand: string;
  numberOfTravelers: number;
  unitPrice: number;
  subtotal: number;
}

export interface TourcmsQuote {
  productCode: string;
  productOptionCode: string;
  travelDate: string;
  startTime: string | null;
  totalPrice: number;
  currencyCode: string;
  lineItems: TourcmsQuoteLineItem[];
}

export interface TourcmsHold {
  channelId: number;
  tourcmsHoldId: string;
  customerId: string | null;
  expiresAt: string | null;
}

export interface TourcmsCommitResult {
  success: boolean;
  tourcmsBookingRef: string | null;
  voucherUrl: string | null;
  error: string | null;
}

export interface TourcmsCancelResult {
  success: boolean;
  error: string | null;
}

export interface TourcmsBookingListItem {
  bookingRef: string;
  status: string;
  modifiedDate: string;
}

export class TourcmsApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = "TOURCMS_ERROR", status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface TourcmsStartBookingInput {
  channelId: number;
  tourId: number;
  componentKey: string;
  travelDate: string;
  paxMix: TourcmsPaxMixEntry[];
  totalCustomers: number;
  travelers?: { firstName: string; lastName: string; ageBand: string }[];
  bookerInfo: { firstName: string; lastName: string; email: string; phone: string };
}

export interface TourcmsAddCustomerInput {
  channelId: number;
  tourcmsHoldId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface TourcmsCustomerAck {
  success: boolean;
}

export interface TourcmsBookingOptions {
  productCode: string;
  travelDate: string;
  options: TourcmsAvailabilitySlot[];
}
