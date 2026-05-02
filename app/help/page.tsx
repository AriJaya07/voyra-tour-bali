import { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: `Help Center | ${SITE_NAME}`,
  description: `Step-by-step help for using ${SITE_NAME}: adding bookings, finding your reference, getting refunds, contacting support, and Bali travel basics.`,
  alternates: { canonical: `${SITE_URL}/help` },
};

interface FAQ {
  q: string;
  a: React.ReactNode;
}

const FAQS: { section: string; items: FAQ[] }[] = [
  {
    section: "Bookings",
    items: [
      {
        q: "Where do I see my bookings?",
        a: (
          <>
            Bookings made through our partner&apos;s widget are confirmed by email from the partner — they
            do not auto-sync to your profile. Open <Link href="/profile#imported-trips" className="text-[#0071CE] hover:underline">My Trips</Link>{" "}
            and tap <strong>Add Booking</strong> to track them in one place.
          </>
        ),
      },
      {
        q: "How do I find my booking reference?",
        a: (
          <>
            Open the confirmation email you received after payment. The reference is usually labelled
            &quot;Booking number&quot;, &quot;Booking reference&quot;, or &quot;Order ID&quot;. Examples:
            <span className="font-mono text-xs"> BR-1234567</span>,{" "}
            <span className="font-mono text-xs">12-DAYTOUR-XYZ</span>.
          </>
        ),
      },
      {
        q: "What information should I save?",
        a: (
          <>
            Booking reference, tour title, travel date, and the &quot;Manage booking&quot; link from your
            confirmation email. The Add Booking modal asks for these — paste from the email.
          </>
        ),
      },
      {
        q: "Can I edit a saved booking?",
        a: (
          <>
            Right now, delete and re-add. Editing in place is on our roadmap. Your booking on the partner
            site is not affected when you delete the local entry.
          </>
        ),
      },
    ],
  },
  {
    section: "Cancellations & refunds",
    items: [
      {
        q: "How do I cancel?",
        a: (
          <>
            Use the <strong>Manage booking</strong> link from your confirmation email — that opens the
            partner&apos;s self-service page where you can cancel in one click. See{" "}
            <Link href="/cancellation-policy" className="text-[#0071CE] hover:underline">
              Booking & Refunds
            </Link>{" "}
            for the policy.
          </>
        ),
      },
      {
        q: "Where does my refund go?",
        a: (
          <>
            Refunds return to the original payment method. Card refunds typically take 3–10 business days,
            digital wallets 1–3 days. The partner sends you a refund confirmation email when it&apos;s
            initiated.
          </>
        ),
      },
      {
        q: "My refund is late",
        a: (
          <>
            Message us on{" "}
            <a
              href={buildWhatsAppUrl("Hello, my refund is late. Booking ref: ")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0071CE] hover:underline"
            >
              WhatsApp
            </a>{" "}
            with your booking reference. We chase the partner on your behalf.
          </>
        ),
      },
    ],
  },
  {
    section: "Account",
    items: [
      {
        q: "How do I change my currency?",
        a: (
          <>
            Open the currency selector in the top-right of the navigation. Your choice is saved to your
            account when signed in.
          </>
        ),
      },
      {
        q: "How do I update my travel preferences?",
        a: (
          <>
            <Link href="/profile/travel-profile" className="text-[#0071CE] hover:underline">
              Travel Profile
            </Link>{" "}
            page — set party size, style tags, region, dietary, mobility. The AI assistant uses this to
            personalise tour suggestions.
          </>
        ),
      },
      {
        q: "Why am I redirected to login when I tap the heart?",
        a: <>Wishlist syncs across devices, so a sign-in is required. Sign in once, and it remembers.</>,
      },
      {
        q: "How do I delete my account?",
        a: (
          <>
            Email{" "}
            <a href="mailto:info@balitravelnow.com" className="text-[#0071CE] hover:underline">
              info@balitravelnow.com
            </a>{" "}
            with the subject &quot;Account deletion&quot;. We respond within 14 days. See our{" "}
            <Link href="/privacy" className="text-[#0071CE] hover:underline">
              Privacy Policy
            </Link>{" "}
            for what stays / what goes.
          </>
        ),
      },
    ],
  },
  {
    section: "Bali basics",
    items: [
      {
        q: "When is the best time to visit?",
        a: (
          <>
            Dry season Apr–Oct is the safer bet for outdoor tours; wet season Nov–Mar still works for
            culture, food, and indoor activities. Avoid Nyepi (March, full island shutdown for 24 hours).
          </>
        ),
      },
      {
        q: "Do tours include hotel pickup?",
        a: (
          <>
            Most tours include pickup in Ubud, Canggu, Seminyak, Kuta, Sanur, Nusa Dua, and Uluwatu zones.
            Pickup zone and timing are shown clearly on each tour page before you book.
          </>
        ),
      },
      {
        q: "What about weather cancellations?",
        a: (
          <>
            Operators reschedule or refund weather-affected outdoor tours — never run unsafe activities. See
            our{" "}
            <Link href="/trust-and-safety" className="text-[#0071CE] hover:underline">
              Trust & Safety
            </Link>{" "}
            page for the full advisory list.
          </>
        ),
      },
      {
        q: "Volcanoes — should I worry?",
        a: (
          <>
            Mt Agung and Mt Batur are active. We monitor official BNPB and PVMBG status daily. Tours in
            flagged zones are paused; you&apos;re contacted to rebook or refund.
          </>
        ),
      },
    ],
  },
];

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Help"
        title="Help Center"
        subtitle="Step-by-step answers for using your account, managing bookings, and getting around Bali."
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-12 text-sm text-blue-800 leading-relaxed">
            Don&apos;t see your question? Reach our local team on{" "}
            <a
              href={buildWhatsAppUrl("Hello, I need help.")}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline"
            >
              WhatsApp
            </a>{" "}
            — we usually reply within minutes.
          </div>

          {FAQS.map((sec) => (
            <SectionBlock key={sec.section} title={sec.section}>
              <div className="space-y-3">
                {sec.items.map((item, i) => (
                  <details
                    key={i}
                    className="group bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
                      <span className="text-sm sm:text-base font-semibold text-gray-900">{item.q}</span>
                      <span className="text-gray-400 shrink-0 transition-transform duration-200 group-open:rotate-180">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</div>
                  </details>
                ))}
              </div>
            </SectionBlock>
          ))}

          <div className="mt-12 bg-gradient-to-br from-[#0071CE]/5 to-blue-50 border border-[#0071CE]/20 rounded-2xl p-6 sm:p-8 text-center">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Still stuck?</h3>
            <p className="text-gray-600 text-sm mb-5">
              Our local team responds in minutes — most questions answered same hour.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={buildWhatsAppUrl("Hello, I have a question.")}
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
              <Link
                href="/trust-and-safety"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#0071CE] text-gray-700 hover:text-[#0071CE] font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                Trust & Safety
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
