import { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: `Understand the cancellation and refund rules for tours and activities booked through ${SITE_NAME} in Bali.`,
  alternates: { canonical: `${SITE_URL}/cancellation-policy` },
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Policies"
        title="Cancellation Policy"
        subtitle="We understand that plans can change. Learn about our cancellation and refund rules before you book."
        lastUpdated="1 April 2025"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="font-bold text-green-800 text-sm">Free Cancellation</p>
              <p className="text-green-700 text-xs mt-1">48+ hours before</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="font-bold text-amber-800 text-sm">Partial Refund</p>
              <p className="text-amber-700 text-xs mt-1">24–48 hours before</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">❌</p>
              <p className="font-bold text-red-800 text-sm">No Refund</p>
              <p className="text-red-700 text-xs mt-1">Less than 24 hours</p>
            </div>
          </div>

          <SectionBlock number="1" title="Standard Cancellation Timeframes">
            <p>The following cancellation rules apply to most tours and activities on Bali Travel Now:</p>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead className="bg-gray-100 text-gray-700 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cancellation Notice</th>
                    <th className="px-4 py-3 font-semibold">Refund Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="bg-white">
                    <td className="px-4 py-3">72 hours or more before activity</td>
                    <td className="px-4 py-3 font-semibold text-green-700">100% Full Refund</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3">48–72 hours before activity</td>
                    <td className="px-4 py-3 font-semibold text-green-700">100% Full Refund</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3">24–48 hours before activity</td>
                    <td className="px-4 py-3 font-semibold text-amber-600">50% Refund</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3">Less than 24 hours before activity</td>
                    <td className="px-4 py-3 font-semibold text-red-600">No Refund</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              * Some specialist activities (private charters, multi-day tours) may have different cancellation rules, which will be stated on the product page.
            </p>
          </SectionBlock>

          <SectionBlock number="2" title="How to Cancel a Booking">
            <p>To cancel a booking, please follow these steps:</p>
            <ol className="list-decimal pl-5 space-y-2 text-gray-600">
              <li>Log in to your account on <strong>balitravelnow.com</strong>.</li>
              <li>Navigate to <strong>My Bookings</strong> in your dashboard.</li>
              <li>Select the booking you wish to cancel and click <strong>"Cancel Booking"</strong>.</li>
              <li>You will receive an email confirmation of your cancellation request within 24 hours.</li>
            </ol>
            <p>
              Alternatively, you may contact us directly via WhatsApp or email with your booking reference number, and our team will process the cancellation for you.
            </p>
          </SectionBlock>

          <SectionBlock number="3" title="Refund Processing">
            <p>
              Approved refunds are currently processed <strong>manually by our team</strong>. Please allow the following timeframes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Bank Transfer:</strong> 3–7 business days</li>
              <li><strong>Credit/Debit Card:</strong> 5–14 business days (depending on your bank)</li>
              <li><strong>E-Wallet:</strong> 1–3 business days</li>
            </ul>
            <p>
              If you have not received your refund within the above timeframe, please contact us with your booking reference and we will investigate promptly.
            </p>
          </SectionBlock>

          <SectionBlock number="4" title="No-Show Policy">
            <p>
              A "no-show" occurs when a customer fails to appear at the meeting point at the scheduled time without prior notice. In such cases:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>No refund will be provided for no-shows.</li>
              <li>The activity will be considered completed and the booking closed.</li>
              <li>There is no option to reschedule after a no-show.</li>
            </ul>
            <p>
              If you are going to be late or need to reach the meeting point, please contact your guide or our WhatsApp support line as early as possible. We will do our best to accommodate you.
            </p>
          </SectionBlock>

          <SectionBlock number="5" title="Changes & Rescheduling">
            <p>
              If you need to change your booking date, we will do our best to accommodate the request subject to availability. Please note:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Date changes must be requested at least <strong>48 hours</strong> before the original booking.</li>
              <li>Only one free date change is permitted per booking.</li>
              <li>If the new date is priced differently, the price difference will be charged.</li>
              <li>Rescheduling requests within 24 hours of the activity are treated as cancellations.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="6" title="Operator-Initiated Cancellations">
            <p>
              In rare circumstances, Bali Travel Now or the local operator may need to cancel a tour due to factors beyond our control, such as:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Severe weather or natural disaster warnings</li>
              <li>Local safety concerns or government directives</li>
              <li>Insufficient participant numbers for group activities</li>
            </ul>
            <p>
              In these cases, you will be notified as soon as possible and offered the choice of a <strong>full refund</strong> or an alternative booking date at no extra cost.
            </p>
          </SectionBlock>

          <SectionBlock number="7" title="Force Majeure">
            <p>
              Bali Travel Now will not be liable for cancellations, delays, or service disruptions caused by events beyond our reasonable control, including but not limited to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Natural disasters, volcanic eruptions, earthquakes, or tsunamis</li>
              <li>Pandemics, government-imposed travel bans, or public health emergencies</li>
              <li>Strikes, riots, or civil unrest</li>
              <li>Extreme adverse weather conditions</li>
            </ul>
            <p>
              In force majeure situations, we will make every effort to reschedule your experience. Refunds in such cases will be assessed on a case-by-case basis.
            </p>
            <p>
              We strongly recommend purchasing comprehensive travel insurance that covers force majeure events before booking.
            </p>
          </SectionBlock>

          <SectionBlock number="8" title="Viator-Powered Activities">
            <p>
              Some activities on our platform are powered by the Viator affiliate network. These products may have different cancellation policies set by the individual operator. Please refer to the specific cancellation policy shown on the product page before booking.
            </p>
            <p>
              For Viator-origin bookings, refunds and cancellations are ultimately governed by Viator's own cancellation terms, and our team will facilitate the process on your behalf.
            </p>
          </SectionBlock>

          <div className="mt-12 bg-gradient-to-br from-[#0071CE]/5 to-blue-50 border border-[#0071CE]/20 rounded-2xl p-6 sm:p-8">
            <h3 className="font-bold text-gray-900 text-lg mb-2">Need to Cancel or Have Questions?</h3>
            <p className="text-gray-600 text-sm mb-5">Our team is available daily to help you with booking changes, cancellations, and refunds.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={buildWhatsAppUrl("Hello, I need help with a cancellation for booking ")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp Support
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-[#0071CE] text-gray-700 hover:text-[#0071CE] font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>

        </div>
      </Container>
    </div>
  );
}
