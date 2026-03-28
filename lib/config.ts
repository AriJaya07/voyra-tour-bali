/**
 * Application configuration.
 *
 * Product source determines the booking flow:
 *   VIATOR → redirect to external Viator URL
 *   LOCAL  → internal Midtrans payment
 *
 * No toggle flags — the product's `source` field drives the flow.
 */
