import { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Booking & Refunds",
  description: `Booking, cancellation, and refund rules for tours and activities found through ${SITE_NAME} in Bali. Most tours offer free cancellation up to 24 hours before.`,
  alternates: { canonical: `${SITE_URL}/cancellation-policy` },
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Booking Policies"
        title="Booking & Refunds"
        subtitle="How booking, cancellation, and refunds work on our platform — clear, traveler-friendly, and operator-set."
        lastUpdated="1 May 2026"
        bannerImage="/images/cancel-policy/banner-cancel.png"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-12 text-sm text-blue-800 leading-relaxed">
            <strong>Quick summary:</strong> Most tours offer <strong>free cancellation up to 24 hours</strong> before
            the start time. The exact cancellation window is shown on every tour page before you book.
            Cancellations and refunds are processed by our trusted booking partner — our local concierge team helps
            you every step.
          </div>

          {/* Quick summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-bold text-green-800 text-sm">Free Cancellation</p>
              <p className="text-green-700 text-xs mt-1">24+ hours before*</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="font-bold text-amber-800 text-sm">Partial / No Refund</p>
              <p className="text-amber-700 text-xs mt-1">Inside cancellation window</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">🔁</p>
              <p className="font-bold text-blue-800 text-sm">Free Reschedule</p>
              <p className="text-blue-700 text-xs mt-1">If operator allows</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center -mt-10 mb-14">
            * Tour-specific. Some specialist activities (private charters, multi-day tours, equipment-heavy trips)
            have different windows shown on the product page.
          </p>

          <SectionBlock number="1" title="Where the cancellation rules come from">
            <p>
              Each tour&apos;s cancellation rules are set by the operator running that activity and shown on the
              individual product page. {SITE_NAME} does not override or change these rules — we display them so
              you can review them <em>before</em> you book.
            </p>
            <p>
              The vast majority of tours we list offer <strong>free cancellation up to 24 hours before</strong>{" "}
              the activity start time. Some require longer notice (often for transport or equipment-heavy trips).
              Read the cancellation block on the product page before confirming.
            </p>
          </SectionBlock>

          <SectionBlock number="2" title="Standard cancellation tiers">
            <p>Most tours follow this structure:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cancellation notice</th>
                    <th className="px-4 py-3 font-semibold">Typical refund</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-white">
                    <td className="px-4 py-3">24 hours or more before activity</td>
                    <td className="px-4 py-3 font-semibold text-green-700">100% Full Refund</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3">Less than 24 hours before activity</td>
                    <td className="px-4 py-3 font-semibold text-red-600">No Refund</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3">Operator-cancelled (weather, safety, etc.)</td>
                    <td className="px-4 py-3 font-semibold text-green-700">100% Refund or free reschedule</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Always check the cancellation block on the product page — it overrides this default.
            </p>
          </SectionBlock>

          <SectionBlock number="3" title="How to cancel a booking">
            <p>You have three ways to cancel:</p>
            <div className="space-y-3 mt-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1">📧 From your booking confirmation email</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Open the email you received at booking and tap the <strong>Manage booking</strong> link. It opens
                  the booking partner&apos;s self-service page where you can cancel in one click.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1">👤 From your Profile on {SITE_NAME}</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Sign in, open <strong>My Bookings</strong>, pick the booking, and follow the link to the
                  partner&apos;s manage-booking page.
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="font-semibold text-gray-900 text-sm mb-1">💬 WhatsApp our concierge team</p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Send your booking reference and we&apos;ll guide you through the cancellation, follow up on the
                  refund, and help with any rebooking. Available daily.
                </p>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock number="4" title="How refunds are processed">
            <p>
              Approved refunds are issued by our booking partner directly to the original payment method. Typical
              processing times:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Credit / debit card:</strong> 3–10 business days, depending on your bank</li>
              <li><strong>Digital wallet:</strong> Usually within 1–3 business days</li>
              <li><strong>Bank transfer:</strong> 3–7 business days</li>
            </ul>
            <p>
              You will receive an email from the booking partner once the refund is initiated. If your refund has
              not arrived after the timeframe above, message us with your booking reference and we&apos;ll chase it.
            </p>
          </SectionBlock>

          <SectionBlock number="5" title="No-show policy">
            <p>
              A no-show occurs when a traveler does not appear at the meeting point at the scheduled time without
              prior notice. In that case:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>No refund is provided.</li>
              <li>The booking is closed and cannot be rescheduled after the start time.</li>
            </ul>
            <p>
              Running late? Message your driver/guide on the contact provided at booking, or message our WhatsApp
              line — we will relay to the operator and try to delay pickup where feasible.
            </p>
          </SectionBlock>

          <SectionBlock number="6" title="Date changes & rescheduling">
            <p>
              Date changes depend on operator availability and the tour-specific reschedule policy:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Most tours allow free reschedule if requested at least 24 hours before the original start time.</li>
              <li>If the new date is priced higher, you pay the difference; if lower, the difference is refunded.</li>
              <li>Inside the cancellation window, a reschedule is treated as a cancellation.</li>
            </ul>
            <p>
              Use the partner&apos;s manage-booking link or message our concierge team — we can coordinate with
              the operator on your behalf.
            </p>
          </SectionBlock>

          <SectionBlock number="7" title="Operator-initiated cancellations">
            <p>
              Operators may cancel a tour for reasons outside their control:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Severe weather, volcanic activity, or natural-disaster warnings</li>
              <li>Government safety directives or closure of attractions</li>
              <li>Insufficient participants for group-only activities</li>
              <li>Vehicle or equipment safety issues</li>
            </ul>
            <p>
              You will be notified by email as soon as the operator confirms the cancellation. You can choose a
              <strong> free reschedule</strong> or a <strong>full refund</strong> through the booking partner.
            </p>
          </SectionBlock>

          <SectionBlock number="8" title="Force majeure">
            <p>
              Neither {SITE_NAME} nor our booking partner is liable for trip disruption caused by events beyond
              reasonable control, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Volcanic eruption, earthquake, tsunami, flooding</li>
              <li>Pandemic, public-health emergency, or travel ban</li>
              <li>Strikes, riots, civil unrest</li>
              <li>Extreme adverse weather</li>
            </ul>
            <p>
              In force-majeure cases, refunds and rescheduling are evaluated by the operator and processed by the
              booking partner. We strongly recommend comprehensive travel insurance covering trip cancellation
              and force-majeure events.
            </p>
          </SectionBlock>

          <SectionBlock number="9" title="Payment-confirmation timing">
            <p>
              You receive an instant e-voucher when payment clears at the partner&apos;s checkout. If the operator
              cannot honour the request (rare — usually capacity limits at peak times), the booking partner issues
              a full automatic refund and we&apos;ll suggest alternative tours that match your dates.
            </p>
          </SectionBlock>

          <SectionBlock number="10" title="Need help?">
            <p>
              Our local team is happy to walk you through any cancellation, refund, or reschedule.
            </p>
          </SectionBlock>

          <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/30 p-6 sm:p-8 shadow-lg min-h-[220px]">
            <div
              aria-hidden
              className="absolute inset-0 bg-[url('/images/banner/sub-banner-cancel.png')] bg-cover bg-center pointer-events-none"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-[#0071CE]/65 via-[#003d80]/55 to-[#0a1f44]/70 pointer-events-none"
            />
            <div className="relative z-10">
              <h3 className="font-bold text-white text-lg mb-2 drop-shadow">Questions about a booking?</h3>
              <p className="text-blue-50 text-sm mb-5 drop-shadow-sm">
                Send your booking reference — we respond fast and stay with you until it&apos;s sorted.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={buildWhatsAppUrl("Hello, I need help with a booking. My reference is: ")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
                >
                  💬 WhatsApp Support
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#0071CE] text-gray-700 hover:text-[#0071CE] font-semibold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
                >
                  Contact Us
                </Link>
                <Link
                  href="/trust-and-safety"
                  className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#0071CE] text-gray-700 hover:text-[#0071CE] font-semibold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
                >
                  Trust & Safety
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
