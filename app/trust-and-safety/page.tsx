import { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: `Trust & Safety | ${SITE_NAME}`,
  description: `How ${SITE_NAME} keeps your Bali trip safe — vetted operators, secure payments, weather and volcano advisories, scam protection, and 24/7 traveler support.`,
  alternates: { canonical: `${SITE_URL}/trust-and-safety` },
};

interface TrustCard {
  icon: string;
  title: string;
  text: string;
}

const TRUST_PILLARS: TrustCard[] = [
  {
    icon: "✅",
    title: "Vetted Operators Only",
    text: "Every tour on our platform is run by licensed Bali operators with verified ratings, insurance, and a track record of positive guest reviews. We remove operators who fall below our service standards.",
  },
  {
    icon: "🔒",
    title: "Secure Booking & Payment",
    text: "Bookings and payments are handled through a globally trusted booking platform with PCI-DSS-compliant checkout. Card details never touch our servers. Look for the padlock and HTTPS at checkout.",
  },
  {
    icon: "💯",
    title: "Instant Confirmation",
    text: "Most tours confirm in seconds with a real e-voucher. If a tour cannot be confirmed, you are not charged — full stop.",
  },
  {
    icon: "📅",
    title: "Free Cancellation on Most Tours",
    text: "The majority of our tours offer free cancellation up to 24 hours before the start time. The exact window is shown clearly on every product before you book.",
  },
  {
    icon: "🛟",
    title: "24/7 Traveler Support",
    text: "Need help while you are in Bali? Reach our local team on WhatsApp any time. We help with rebooking, lost vouchers, language barriers, or last-minute changes.",
  },
  {
    icon: "🌴",
    title: "Local, Not Outsourced",
    text: "Our team lives in Bali. We answer in your timezone, in plain English, and we know the operators personally — not from a script.",
  },
];

const ADVISORIES: TrustCard[] = [
  {
    icon: "🌧️",
    title: "Weather & Wet Season",
    text: "Wet season runs Nov–Mar with afternoon rain. Outdoor tours like Mt Batur sunrise, snorkeling, and waterfall trips can be paused for safety. Operators reschedule or refund — never run unsafe.",
  },
  {
    icon: "🌋",
    title: "Volcano Advisory (Mt Agung & Mt Batur)",
    text: "Mt Agung and Mt Batur are active. We monitor official BNPB and PVMBG status daily. If a tour falls in a flagged zone, you will be contacted to rebook or refund. We never operate in elevated alert zones.",
  },
  {
    icon: "🏛️",
    title: "Cultural Respect at Temples",
    text: "Temples require a sarong and sash; menstruating visitors traditionally do not enter inner sanctums. On Nyepi (March, Balinese New Year) the entire island shuts down for 24 hours. We will warn you before booking on these dates.",
  },
  {
    icon: "🌊",
    title: "Water & Beach Safety",
    text: "Bali has strong rip currents on the south and east coasts. Surf with operators who provide certified instructors. Swim only at flagged beaches. We list water conditions on every water activity.",
  },
  {
    icon: "🐒",
    title: "Animal Welfare Standards",
    text: "We do not list elephant rides, dolphin pens, or kopi luwak farms that mistreat animals. Our wildlife tours follow ethical standards: no riding, no swimming with captive marine life, no caged civet coffee.",
  },
  {
    icon: "🚗",
    title: "Transport & Pickup",
    text: "Driver-led pickup is included on most tours and covers Ubud, Canggu, Seminyak, Kuta, Sanur, Nusa Dua, and Uluwatu zones. Pickup zone and timing are confirmed before you book.",
  },
];

const SCAM_PROTECTIONS: TrustCard[] = [
  {
    icon: "💸",
    title: "No Hidden Fees",
    text: "The price you see at checkout is the total price — taxes and operator fees included. We do not charge service fees on top. No surprise add-ons at the meeting point.",
  },
  {
    icon: "🪪",
    title: "Identity Protection",
    text: "Your name, email, and phone are encrypted and only shared with the operator running your specific tour. We never sell or rent your data to third parties.",
  },
  {
    icon: "💱",
    title: "Real Exchange Rates",
    text: "Prices in your local currency use live mid-market rates — no inflated tourist conversion. You see the IDR equivalent before you confirm.",
  },
  {
    icon: "🚫",
    title: "Fake-Operator Filter",
    text: "We turn down 30%+ of operator applications. Required: valid Indonesian tour licence, insurance certificate, 4.0+ traveler rating, multi-year track record. We review listings quarterly.",
  },
  {
    icon: "📝",
    title: "Verified Reviews Only",
    text: "Reviews come from travelers with confirmed completed bookings. We do not delete bad reviews — we use them to remove bad operators.",
  },
  {
    icon: "🆘",
    title: "Emergency Pathway",
    text: "If something goes wrong on tour — operator no-show, vehicle breakdown, safety concern — message our WhatsApp line and we will dispatch a replacement, refund, or coordinate with local authorities.",
  },
];

const HEALTH_TIPS: { label: string; text: string }[] = [
  { label: "Drinking water", text: "Stick to sealed bottled water. Avoid ice from street vendors. Hotel ice is fine." },
  { label: "Bali belly", text: "Carry oral rehydration salts. Eat at busy warungs (high turnover = fresh food)." },
  { label: "Mosquitoes", text: "Dengue is present year-round. Use DEET repellent at dawn and dusk." },
  { label: "Travel insurance", text: "We strongly recommend insurance covering medical, evacuation, and trip cancellation." },
  { label: "ATMs", text: "Use ATMs inside bank branches or malls. Skimmers happen at street ATMs." },
  { label: "Motorbikes", text: "Always wear a helmet. Many travel insurance plans require a valid international motorbike licence — check before riding." },
];

export default function TrustAndSafetyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Trust & Safety"
        title="Travel Bali with Confidence"
        subtitle="How we protect your money, your data, and your trip — from the first click to your last sunset."
        lastUpdated="1 May 2026"
      />

      <Container>
        <div className="max-w-4xl mx-auto py-14 sm:py-20">

          {/* Hero promise */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-6 sm:p-8 mb-14">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Our promise to you
            </h2>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
              We are a Bali-based discovery and concierge platform. We handpick tours, list real prices, and connect
              you to a globally trusted booking checkout for instant confirmation. If anything is unclear or goes
              sideways before, during, or after your trip — our local team is one WhatsApp message away.
            </p>
          </div>

          {/* Trust pillars */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Why travelers trust us</h2>
          <p className="text-gray-500 mb-8 text-sm sm:text-base">Six promises we keep on every booking.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {TRUST_PILLARS.map((c) => (
              <Card key={c.title} {...c} />
            ))}
          </div>

          {/* Bali advisories */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Bali-specific advisories</h2>
          <p className="text-gray-500 mb-8 text-sm sm:text-base">
            Real concerns travelers ask about — and how our platform handles them.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-16">
            {ADVISORIES.map((c) => (
              <Card key={c.title} {...c} />
            ))}
          </div>

          {/* Scam protections */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Scam & fraud protection</h2>
          <p className="text-gray-500 mb-8 text-sm sm:text-base">
            Bali tourism unfortunately has bad actors. Here is how we keep them off our platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
            {SCAM_PROTECTIONS.map((c) => (
              <Card key={c.title} {...c} />
            ))}
          </div>

          {/* Health & safety tips */}
          <SectionBlock title="Health & on-the-ground safety tips">
            <p>Practical pointers from our local team — not paid advertising.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {HEALTH_TIPS.map((t) => (
                <div key={t.label} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <p className="font-semibold text-gray-900 text-sm mb-1">{t.label}</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          </SectionBlock>

          {/* Operator standards */}
          <SectionBlock title="Operator vetting standards">
            <p>Every tour operator on our platform must satisfy all of the following:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Valid Indonesian tour-operator licence (TDUP or equivalent)</li>
              <li>Active third-party liability insurance</li>
              <li>Minimum 4.0/5 average traveler rating across &gt;50 reviews</li>
              <li>Two or more consecutive operating years</li>
              <li>Documented safety briefing for every activity</li>
              <li>Vehicle maintenance and driver licensing on file</li>
              <li>Compliance with our animal welfare and cultural respect standards</li>
            </ul>
            <p>We re-audit operators every quarter. Listings that fall below standard are paused or removed.</p>
          </SectionBlock>

          {/* Data security */}
          <SectionBlock title="Data security">
            <p>We use the same security practices as global travel platforms:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>HTTPS / TLS 1.2+ encryption on every page</li>
              <li>Bcrypt password hashing</li>
              <li>Card details handled exclusively by our PCI-DSS-compliant payment partner — never stored on our servers</li>
              <li>Personal data shared with operators only for the specific tour you booked, on a need-to-know basis</li>
              <li>Quarterly access reviews and least-privilege engineering practices</li>
            </ul>
            <p>
              Read more in our{" "}
              <Link href="/privacy" className="text-[#0071CE] underline hover:opacity-75">
                Privacy Policy
              </Link>
              .
            </p>
          </SectionBlock>

          {/* What if it goes wrong */}
          <SectionBlock title="If something goes wrong">
            <p>The most common issues — and what to do:</p>
            <div className="space-y-3 mt-3">
              <Issue
                problem="Operator did not show up"
                action="Message our WhatsApp line within 30 minutes. We will contact the operator, dispatch a replacement, or process a full refund through the booking partner."
              />
              <Issue
                problem="Tour cancelled by weather or operator"
                action="You will be notified by email and offered a free reschedule or full refund through the booking partner. No fees from us."
              />
              <Issue
                problem="Lost or unclear voucher"
                action="Voucher is in your email and your Profile page. Tap 'Resend e-ticket' or message us — we will resend within minutes."
              />
              <Issue
                problem="Need to cancel"
                action="See our Booking & Refunds page for the policy. Most tours allow free cancellation up to 24 hours before. Cancel from your Profile or via WhatsApp."
              />
              <Issue
                problem="Concern about safety or behavior"
                action="Contact us immediately. We escalate to local authorities when needed and remove operators who fail safety reviews."
              />
            </div>
          </SectionBlock>

          {/* CTA */}
          <div className="mt-12 bg-gradient-to-br from-[#0071CE]/5 to-blue-50 border border-[#0071CE]/20 rounded-2xl p-6 sm:p-8 text-center">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Still have a concern?</h3>
            <p className="text-gray-600 text-sm mb-5 max-w-md mx-auto">
              Our local team responds in minutes. Ask anything before you book — or once you arrive in Bali.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={buildWhatsAppUrl("Hello, I have a Trust & Safety question.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                💬 WhatsApp our team
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#0071CE] text-gray-700 hover:text-[#0071CE] font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                Contact form
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Card({ icon, title, text }: TrustCard) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h3>
      <p className="text-gray-500 text-xs leading-relaxed">{text}</p>
    </div>
  );
}

function Issue({ problem, action }: { problem: string; action: string }) {
  return (
    <div className="border-l-4 border-[#0071CE] bg-blue-50/40 rounded-r-xl px-4 py-3">
      <p className="font-semibold text-gray-900 text-sm">{problem}</p>
      <p className="text-gray-600 text-sm mt-1 leading-relaxed">{action}</p>
    </div>
  );
}
