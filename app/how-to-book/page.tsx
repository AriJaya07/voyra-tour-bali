import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: `How to Book | ${SITE_NAME}`,
  description: `Learn how to book tours and activities in Bali through ${SITE_NAME}. Step-by-step guide for a seamless booking experience.`,
  alternates: { canonical: `${SITE_URL}/how-to-book` },
};

const IS_MOCK = process.env.NEXT_PUBLIC_VIATOR_MOCK_BOOKING === "true";

// ── Step data ────────────────────────────────────────────────────────────

interface Step {
  number: number;
  icon: string;
  title: string;
  description: string;
  details: string[];
}

const MOCK_STEPS: Step[] = [
  {
    number: 1,
    icon: "🔍",
    title: "Browse & Choose Your Tour",
    description: "Explore our curated Bali experiences and find the perfect activity for you.",
    details: [
      "Browse destinations from the homepage or use the search bar",
      "View tour details, photos, itinerary, and reviews",
      "Check available dates and pricing per person",
    ],
  },
  {
    number: 2,
    icon: "📝",
    title: "Fill in Your Details",
    description: "Select your preferred date and provide traveler information.",
    details: [
      "Pick your travel date from the calendar",
      "Select the number of travelers (adults, children)",
      "Choose your preferred tour language if available",
      "Enter lead traveler contact info (name, email, phone)",
      "Add names for all travelers in your group",
    ],
  },
  {
    number: 3,
    icon: "📍",
    title: "Select Pickup & Add Notes",
    description: "Tell us where to pick you up and any special requirements.",
    details: [
      "Choose a hotel or location for pickup (or decide later)",
      "Add special requests like dietary needs or accessibility",
    ],
  },
  {
    number: 4,
    icon: "💬",
    title: "Confirm via WhatsApp",
    description: "Review your booking summary and connect with our team instantly.",
    details: [
      "Review all your booking details on the confirmation screen",
      "Accept the terms and click \"Confirm & Contact via WhatsApp\"",
      "WhatsApp opens automatically with your booking details",
      "Our team will confirm availability and send you a payment link",
    ],
  },
  {
    number: 5,
    icon: "💳",
    title: "Pay & Receive Your Ticket",
    description: "Complete payment securely and get your e-ticket.",
    details: [
      "Receive a secure payment link via WhatsApp",
      "Pay online through our payment gateway",
      "Your e-ticket will appear in your profile once confirmed",
      "Download or show your ticket on the day of the tour",
    ],
  },
];

const DIRECT_STEPS: Step[] = [
  {
    number: 1,
    icon: "🔍",
    title: "Browse & Choose Your Tour",
    description: "Explore our curated Bali experiences and find the perfect activity.",
    details: [
      "Browse destinations from the homepage or use the search bar",
      "View tour details, photos, itinerary, and reviews",
      "Check real-time availability and live pricing from Viator",
    ],
  },
  {
    number: 2,
    icon: "📅",
    title: "Select Date & Travelers",
    description: "Pick your preferred date and number of travelers to see real-time pricing.",
    details: [
      "Select your travel date from the calendar",
      "Choose the number of adults, children, or other age groups",
      "Real-time pricing updates automatically from Viator",
      "Select your tour option if multiple are available",
    ],
  },
  {
    number: 3,
    icon: "📝",
    title: "Fill in Booking Details",
    description: "Provide contact information, traveler details, and preferences.",
    details: [
      "Enter lead traveler contact info (name, email, phone)",
      "Add names for all travelers in your group",
      "Choose your preferred tour language",
      "Select pickup location or meeting point",
      "Answer any tour-specific questions from the provider",
    ],
  },
  {
    number: 4,
    icon: "💳",
    title: "Pay Securely Online",
    description: "Complete your payment through our secure checkout powered by Viator.",
    details: [
      "Review your booking summary and total price",
      "Your spot is temporarily held while you complete payment",
      "Pay securely via credit card, debit card, or PayPal through Viator's checkout",
      "Receive instant booking confirmation once payment is processed",
    ],
  },
  {
    number: 5,
    icon: "🎫",
    title: "Get Your E-Ticket",
    description: "Your ticket is ready — show it on the day of your tour.",
    details: [
      "Check your email for booking confirmation and voucher",
      "View and download your e-ticket from your profile",
      "Show the ticket (QR code or voucher) to your guide",
      "Enjoy your Bali adventure!",
    ],
  },
];

// ── Components ───────────────────────────────────────────────────────────

function StepCard({ step, total }: { step: Step; total: number }) {
  return (
    <div className="relative flex gap-4 sm:gap-6">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0071CE] text-white flex items-center justify-center text-xl sm:text-2xl shadow-lg shadow-blue-200">
          {step.icon}
        </div>
        {step.number < total && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-[#0071CE]/40 to-[#0071CE]/10 mt-3" />
        )}
      </div>

      {/* Content */}
      <div className="pb-10 sm:pb-12 flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-xs font-bold text-[#0071CE] bg-blue-50 px-2.5 py-0.5 rounded-full">
            Step {step.number}
          </span>
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 leading-snug">
          {step.title}
        </h3>
        <p className="text-gray-500 text-sm sm:text-base mb-4 leading-relaxed">
          {step.description}
        </p>
        <ul className="space-y-2.5">
          {step.details.map((detail, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </span>
              <span className="leading-relaxed">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TipCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-2xl mb-3">{icon}</div>
      <h4 className="font-bold text-gray-900 text-sm mb-1.5">{title}</h4>
      <p className="text-gray-500 text-xs leading-relaxed">{text}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function HowToBookPage() {
  const steps = IS_MOCK ? MOCK_STEPS : DIRECT_STEPS;
  const WA_URL = buildWhatsAppUrl();

  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Guide"
        title="How to Book"
        subtitle="Follow these simple steps to book your perfect Bali experience. It only takes a few minutes."
        bannerImage="/images/how-book/banner-book.png"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">

          {/* Booking Mode Badge */}
          <div className="flex justify-center mb-12">
            {IS_MOCK ? (
              <div className="inline-flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-full px-5 py-2.5">
                <span className="text-lg">💬</span>
                <div>
                  <p className="text-sm font-bold text-green-800">WhatsApp Booking</p>
                  <p className="text-xs text-green-600">Reserve now, pay after confirmation</p>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-full px-5 py-2.5">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="text-sm font-bold text-blue-800">Instant Online Booking</p>
                  <p className="text-xs text-blue-600">Pay securely via Viator and get your ticket instantly</p>
                </div>
              </div>
            )}
          </div>

          {/* Steps Timeline */}
          <div className="mb-16">
            {steps.map((step) => (
              <StepCard key={step.number} step={step} total={steps.length} />
            ))}
          </div>

          {/* Tips Section */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
              Booking Tips
            </h2>
            <p className="text-gray-500 text-center text-sm sm:text-base mb-8 max-w-lg mx-auto">
              Make the most of your booking experience with these helpful tips.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <TipCard
                icon="📱"
                title="Create an Account First"
                text="Sign up or log in before booking so your details are saved and you can track all your bookings easily."
              />
              <TipCard
                icon="📅"
                title="Book in Advance"
                text="Popular tours sell out fast, especially during peak season (July–August, December). Book at least 3 days ahead."
              />
              <TipCard
                icon="🌤️"
                title="Check the Weather"
                text="Bali has a dry season (April–October) and wet season. Outdoor activities are best during dry months."
              />
              <TipCard
                icon="👥"
                title="Double-Check Traveler Info"
                text="Make sure all traveler names match their ID or passport. Incorrect names may cause issues at the venue."
              />
              <TipCard
                icon="📍"
                title="Confirm Your Pickup"
                text="If your tour includes hotel pickup, make sure your hotel address is correct and be ready 10 minutes early."
              />
              <TipCard
                icon="❌"
                title="Know the Cancellation Policy"
                text="Most tours offer free cancellation 24–48 hours before. Check the policy on the tour detail page before booking."
              />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <FaqItem
                question="Do I need to create an account to book?"
                answer="Yes, you need to log in or create a free account so we can save your booking details and send you your e-ticket."
              />
              <FaqItem
                question="What payment methods are accepted?"
                answer={IS_MOCK
                  ? "After confirming via WhatsApp, our team will send you a secure payment link. You can pay via bank transfer, e-wallet (GoPay, OVO, Dana), or credit card."
                  : "Payment is processed securely through Viator's checkout. You can pay via credit card, debit card, or PayPal."
                }
              />
              <FaqItem
                question="Can I cancel or modify my booking?"
                answer="Most tours offer free cancellation 24–48 hours before the activity. Check the specific cancellation policy on the tour detail page. To modify, contact us via WhatsApp."
              />
              <FaqItem
                question="When will I receive my ticket?"
                answer={IS_MOCK
                  ? "After payment is confirmed, our team will process your booking and send your e-ticket via email. You can also view it in your profile."
                  : "You will receive an instant confirmation from Viator after payment. Your e-ticket or voucher will be available in your profile and sent to your email."
                }
              />
              <FaqItem
                question="What if I need help during booking?"
                answer="You can reach our team anytime via WhatsApp. We're here to help with tour selection, booking issues, or any questions about your Bali trip."
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="relative rounded-3xl overflow-hidden text-center text-white">
            <Image
              src="/images/how-book/banner-explore.png"
              alt="Explore Bali"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/80 to-[#003d80]/85" />
            <div className="relative p-8 sm:p-12">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                Ready to Explore Bali?
              </h2>
              <p className="text-blue-100 text-sm sm:text-base mb-8 max-w-md mx-auto leading-relaxed">
                Browse our handpicked tours and start planning your unforgettable Bali adventure today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#0071CE] font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg text-sm"
                >
                  Browse Tours
                </Link>
                <a
                  href={WA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1ebe5d] transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                >
                  💬 Chat with Us
                </a>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}

// ── FAQ Item ──────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
      <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none">
        <span className="text-sm sm:text-base font-semibold text-gray-900">{question}</span>
        <span className="text-gray-400 shrink-0 transition-transform duration-200 group-open:rotate-180">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </summary>
      <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
        {answer}
      </div>
    </details>
  );
}
