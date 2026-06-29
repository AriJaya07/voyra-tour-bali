// Curated Bali regions for the interactive Map Explorer (/explore).
// `name` MUST match the values stored in Guide.region so we can join published
// guide counts and deep-link into the /guides?region= filter and /ai/plan?region=.
// Coordinates are approximate region centers (good enough for a discovery map).

export interface BaliRegion {
  name: string;
  lat: number;
  lng: number;
  blurb: string;
  emoji: string;
}

export const BALI_REGIONS: BaliRegion[] = [
  { name: "Ubud", lat: -8.5069, lng: 115.2625, emoji: "🌿", blurb: "Rice terraces, temples, yoga and Bali's cultural heart." },
  { name: "Canggu", lat: -8.6478, lng: 115.1385, emoji: "🏄", blurb: "Surf breaks, beach clubs and a buzzing digital-nomad scene." },
  { name: "Seminyak", lat: -8.6913, lng: 115.1686, emoji: "🍸", blurb: "Upscale dining, boutiques and golden-hour sunset bars." },
  { name: "Kuta", lat: -8.7215, lng: 115.1686, emoji: "🌅", blurb: "Lively beachfront, nightlife and beginner-friendly waves." },
  { name: "Sanur", lat: -8.6878, lng: 115.262, emoji: "🚲", blurb: "Calm east-coast beaches, sunrise walks and a laid-back pace." },
  { name: "Nusa Dua", lat: -8.8008, lng: 115.2317, emoji: "🏖️", blurb: "Resort enclave with white sand and watersports." },
  { name: "Uluwatu", lat: -8.8291, lng: 115.0849, emoji: "🛕", blurb: "Clifftop temple, world-class surf and dramatic sunsets." },
  { name: "Lovina", lat: -8.1583, lng: 115.0256, emoji: "🐬", blurb: "Black-sand north coast famous for dawn dolphin trips." },
  { name: "Amed", lat: -8.3389, lng: 115.6878, emoji: "🤿", blurb: "Quiet diving and snorkeling village on the far east coast." },
  { name: "Nusa Penida", lat: -8.7273, lng: 115.5444, emoji: "🏝️", blurb: "Rugged island cliffs, manta rays and iconic viewpoints." },
];
