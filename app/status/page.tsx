import { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: `Status & Limitations | ${SITE_NAME}`,
  description: `What ${SITE_NAME} can and can't do — honest status of features, partner integration, and roadmap.`,
  alternates: { canonical: `${SITE_URL}/status` },
};

interface StatusItem {
  feature: string;
  state: "OK" | "PARTIAL" | "PLANNED" | "OFF";
  note: string;
}

const STATE_STYLE: Record<StatusItem["state"], string> = {
  OK: "bg-green-50 text-green-700 border-green-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  PLANNED: "bg-blue-50 text-blue-700 border-blue-200",
  OFF: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATE_DOT: Record<StatusItem["state"], string> = {
  OK: "bg-green-500",
  PARTIAL: "bg-amber-500",
  PLANNED: "bg-blue-500",
  OFF: "bg-gray-400",
};

const STATE_LABEL: Record<StatusItem["state"], string> = {
  OK: "Working",
  PARTIAL: "Partial",
  PLANNED: "Roadmap",
  OFF: "Not built here",
};

const SECTIONS: { title: string; items: StatusItem[] }[] = [
  {
    title: "Discovery & browsing",
    items: [
      { feature: "Browse tours & destinations", state: "OK", note: "Live partner inventory + local destinations." },
      { feature: "Search + filters", state: "OK", note: "Category, price, rating." },
      { feature: "AI travel assistant", state: "OK", note: "Bali-aware, multi-language, personalised when signed in." },
      { feature: "Multi-language UI", state: "PLANNED", note: "Bahasa Indonesia, Chinese, Japanese, Korean, Russian." },
      { feature: "Travel guides (long-form)", state: "PARTIAL", note: "/guides published; editorial pipeline + bulk seeding TODO." },
      { feature: "PWA / install on mobile", state: "OK", note: "Manifest + service worker registered. Install prompt on supported browsers." },
      { feature: "Wishlist (cross-device)", state: "OK", note: "Saved to your account, synced across devices." },
      { feature: "Recently viewed", state: "OK", note: "Auto-clears after 24 hours for privacy." },
    ],
  },
  {
    title: "Booking & payments",
    items: [
      { feature: "Tour booking (most tours)", state: "OK", note: "Handled by our trusted booking partner — instant confirmation, secure checkout." },
      { feature: "Local-destination booking", state: "OK", note: "Local tours bookable end-to-end via Midtrans. Cancellation supported up to 24h before travel." },
      { feature: "Payment processing", state: "OFF", note: "Handled entirely by partner's PCI-DSS-compliant gateway. Card details never touch our servers." },
      { feature: "Cancellation & refunds", state: "OFF", note: "Processed by booking partner per operator's policy. We can guide you, but the action happens on partner side." },
      { feature: "Reschedule", state: "OFF", note: "Use partner's manage-booking link from your confirmation email." },
    ],
  },
  {
    title: "Account & profile",
    items: [
      { feature: "Account creation + sign-in", state: "OK", note: "Email/password or Google." },
      { feature: "My Trips (imported partner bookings)", state: "OK", note: "Manual paste — partner widget does not auto-sync." },
      { feature: "Travel Profile (preferences)", state: "OK", note: "Party, style, region, dietary, mobility. Feeds AI." },
      { feature: "Bali Notes (journal)", state: "OK", note: "Public + private notes, no booking gate." },
      { feature: "Currency preference", state: "OK", note: "Saved to your account, applied site-wide." },
      { feature: "Email-forward voucher import", state: "PLANNED", note: "Forward your confirmation email — auto-create trip. Sprint 6+." },
      { feature: "Trip Calendar", state: "OK", note: "Imported trips + saved itineraries on a single calendar." },
      { feature: "Survival Pack", state: "OK", note: "Pre-trip cheat sheet with print-friendly layout." },
      { feature: "Account export + delete", state: "OK", note: "Download your data as JSON; delete with anonymisation of legal-retention rows." },
    ],
  },
  {
    title: "Trust & safety",
    items: [
      { feature: "HTTPS / TLS encryption", state: "OK", note: "Every page." },
      { feature: "Bcrypt password hashing", state: "OK", note: "Industry-standard." },
      { feature: "Login lockout on repeated failures", state: "OK", note: "3 attempts before short cooldown." },
      { feature: "Volcano / weather / Nyepi alerts", state: "PARTIAL", note: "Opt-in toggles ready in Notifications. External feeds (PVMBG/BMKG) wiring in progress." },
      { feature: "Operator vetting", state: "OK", note: "Licence, insurance, rating ≥4.0, multi-year track record. Quarterly audit." },
    ],
  },
  {
    title: "AI features",
    items: [
      { feature: "Chat assistant with tour cards", state: "OK", note: "Groq LLM, multi-language, personalised when signed in." },
      { feature: "AI Trip Planner page", state: "OK", note: "Day-by-day itinerary at /plan with bookable cards." },
      { feature: "Saved itineraries + share link", state: "OK", note: "Save private or generate a public share link." },
      { feature: "Review summariser on tour pages", state: "PLANNED", note: "Aggregated highlights from public Bali Notes." },
    ],
  },
  {
    title: "Loyalty & community",
    items: [
      { feature: "Public Bali Notes feed", state: "OK", note: "Aggregated traveler notes shown on tour & destination pages." },
      { feature: "Loyalty points & tier", state: "OK", note: "Earn 1pt/Rp1,000 base + tier multiplier. View at /profile/rewards." },
      { feature: "Referral program", state: "PARTIAL", note: "Codes + invites supported. Auto-credit on friend booking pending wiring." },
      { feature: "Operator self-serve apply", state: "OK", note: "Operators apply at /operator/apply. Admin approval flow + listings management TODO." },
      { feature: "Email lifecycle (abandoned wishlist, anniversary)", state: "PARTIAL", note: "Deliveries queued by cron. ESP send wiring TODO." },
    ],
  },
];

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Transparency"
        title="Status & Limitations"
        subtitle="Honest snapshot of what works today, what's partial, and what's coming."
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-12">
            {(["OK", "PARTIAL", "PLANNED", "OFF"] as const).map((s) => (
              <div key={s} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${STATE_STYLE[s]}`}>
                <span className={`w-2 h-2 rounded-full ${STATE_DOT[s]}`} />
                {STATE_LABEL[s]}
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-12 text-sm text-blue-800 leading-relaxed">
            <strong>Why this page?</strong> Travel platforms often promise more than they deliver. We&apos;d
            rather tell you up front what we own, what our booking partner owns, and what is on the
            roadmap. If something here is unclear, message us on{" "}
            <a
              href={buildWhatsAppUrl("Question about Voyra status page")}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              WhatsApp
            </a>
            .
          </div>

          {SECTIONS.map((sec) => (
            <SectionBlock key={sec.title} title={sec.title}>
              <ul className="space-y-2">
                {sec.items.map((it) => (
                  <li
                    key={it.feature}
                    className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl p-4"
                  >
                    <span
                      className={`shrink-0 mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${STATE_STYLE[it.state]}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${STATE_DOT[it.state]}`} />
                      {STATE_LABEL[it.state]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{it.feature}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{it.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionBlock>
          ))}

          <SectionBlock title="What's deliberately out of scope">
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600 text-sm">
              <li>Acting as a licensed tour operator — we curate, partners deliver.</li>
              <li>Holding card details — partner handles secure checkout.</li>
              <li>Issuing refunds directly — partner controls the refund flow.</li>
              <li>Hotel and flight booking — outside our brand focus.</li>
              <li>Real-time auto-sync of partner bookings — partner widget does not expose a callback to affiliates. Imported manually for now.</li>
            </ul>
            <p className="text-xs text-gray-500 mt-3">
              We re-evaluate this list every quarter. See{" "}
              <Link href="/trust-and-safety" className="text-[#0071CE] hover:underline">
                Trust & Safety
              </Link>{" "}
              for our broader operator and data standards.
            </p>
          </SectionBlock>

          <div className="mt-8 text-center text-xs text-gray-400">
            Last reviewed: 1 May 2026
          </div>
        </div>
      </Container>
    </div>
  );
}
