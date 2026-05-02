/**
 * Centralised marketing copy + tooltip strings for the AI subsystem.
 *
 * Putting them here keeps the messaging consistent across hero, plans page,
 * profile/ai, and FAQ — and makes a future i18n migration a single-folder
 * move.
 */

export const AI_HERO_TAGLINES = [
  "Bali AI that knows what's open, what's sacred, and what's worth your time.",
  "From sunrise volcano hike to evening rooftop dinner — plan in seconds.",
  "Plans, refines, books. And remembers what you like next time.",
];

export const AI_HERO_GUEST_PROMPTS = [
  "Plan a 5-day Bali honeymoon with rice fields + spa days.",
  "We're family of 4 — what's safe and fun for kids in Ubud?",
  "Best sunset in Uluwatu without the crowds?",
  "Is anything closed for Galungan next month?",
];

export const TRUST_BULLETS: { icon: string; text: string }[] = [
  { icon: "⏱", text: "Subscription credits valid 365 days" },
  { icon: "🔒", text: "No card stored on file" },
  { icon: "📊", text: "Every credit traceable in your wallet" },
  { icon: "↩️", text: "7-day refund window on all purchases" },
];

export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is an AI credit?",
    a: "1 credit ≈ 1,000 tokens of AI work. Most chat turns cost 2 credits, an itinerary plan costs 8 (or 12 for 8–14 days), and a voucher reader scan costs 5. Top-up packs convert directly to credits.",
  },
  {
    q: "When do my credits expire?",
    a: "Welcome bonus: 7 days from signup. Subscription monthly grant: 365 days. Top-up packs: 365 days. Free monthly: 35 days. Loyalty redemption: 90 days. The wallet shows each bucket separately so you always know what dies when.",
  },
  {
    q: "Do credits stack across renewals?",
    a: "Yes. Each subscription renewal grants a fresh batch valid 365 days. Unused credits from prior batches keep ticking down on their own clocks — they don't get clobbered.",
  },
  {
    q: "What if I cancel?",
    a: "You keep every credit you've already earned. They expire on their own original schedule (welcome 7d, subscription 365d, etc.). Your subscription stops renewing at the period end.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. Within 7 days of any top-up or new subscription, contact support. We refund the unused credits and revert the payment.",
  },
  {
    q: "Why 7-day welcome bonus?",
    a: "Long enough to build a real itinerary. Short enough to find out if Voyra AI is right for you. After that, you choose the plan that fits how often you travel.",
  },
  {
    q: "Which model does the AI use?",
    a: "Llama 3.3 70B via Groq (fast + good for travel knowledge). Voucher Reader uses Claude Haiku 4.5 for vision when enabled.",
  },
  {
    q: "How can I earn AI credits without paying?",
    a: "Welcome bonus on signup (50 credits / 7 days). Every confirmed booking earns 5 AI credits per Rp 100,000 spent — multiplied by your loyalty tier (Bronze 1× / Silver 1.5× / Gold 2×). Refer a friend — when they book a tour, you earn up to 200 credits per their booking, lifetime. Plus 1,000 legacy loyalty points → 100 AI credits at the Rewards page.",
  },
  {
    q: "How does the referral reward work?",
    a: "You share your code from the Rewards page. Friend signs up — they get the standard 50-credit welcome bonus. The reward kicks in when they make a confirmed booking: you earn 10 credits per Rp 100,000 of their booking (up to 200 per booking, every booking). Their first booking also unlocks a 50-credit thank-you for them. We don't pay on signup alone — only real travel triggers payouts. That keeps the system fair.",
  },
];

export const COMPARISON_ROWS: {
  label: string;
  voyra: string | true | false;
  chatgpt: string | true | false;
  generic: string | true | false;
}[] = [
  { label: "Bali product knowledge", voyra: "Curated DB + live Viator search", chatgpt: "Generic", generic: "None" },
  { label: "Bookable links in answers", voyra: true, chatgpt: false, generic: false },
  { label: "Cultural calendar (Galungan, Nyepi)", voyra: true, chatgpt: false, generic: false },
  { label: "Day-of-trip helper while you travel", voyra: "Free for confirmed travelers", chatgpt: false, generic: false },
  { label: "Voucher reader (image → calendar event)", voyra: true, chatgpt: false, generic: false },
  { label: "Memory across sessions", voyra: "Voyager+", chatgpt: "Limited", generic: false },
  { label: "Family seats", voyra: "Founder, 3 seats", chatgpt: false, generic: false },
  { label: "Transparent credit ledger", voyra: true, chatgpt: false, generic: false },
];
