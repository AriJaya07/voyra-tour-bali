import { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Read the Terms & Conditions for using ${SITE_NAME}. Understand your rights and responsibilities when booking tours and activities in Bali.`,
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Legal"
        title="Terms & Conditions"
        subtitle="Please read these terms carefully before booking any tour or activity through Bali Travel Now."
        lastUpdated="1 April 2025"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">

          {/* Intro */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-12 text-sm text-amber-800 leading-relaxed">
            <strong>Important:</strong> By accessing our website or completing a booking, you agree to be bound by the following Terms & Conditions. If you do not agree, please do not use our services.
          </div>

          <SectionBlock number="1" title="Acceptance of Terms">
            <p>
              These Terms & Conditions govern your use of <strong>Bali Travel Now</strong> (balitravelnow.com), operated by Bali Travel, a licensed travel agency based in Bali, Indonesia. By visiting our website, creating an account, or making a booking, you confirm that you have read, understood, and agree to these terms.
            </p>
          </SectionBlock>

          <SectionBlock number="2" title="Booking Terms">
            <p>
              All bookings are subject to availability and are confirmed only upon receipt of full payment (or a confirmed deposit where applicable). After completing a booking, you will receive a confirmation email with your booking reference and activity details.
            </p>
            <p>
              It is your responsibility to provide accurate and complete information during the booking process. Bali Travel Now is not liable for any issues arising from incorrect information supplied by the customer.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Bookings must be made at least 24 hours before the scheduled activity.</li>
              <li>Group bookings of 10+ persons require a minimum of 72 hours' notice.</li>
              <li>All activities are subject to local conditions, weather, and availability.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="3" title="Payment Terms">
            <p>
              All prices listed on the website are in <strong>US Dollars (USD)</strong> or <strong>Indonesian Rupiah (IDR)</strong> as indicated per product. Prices include local taxes unless stated otherwise.
            </p>
            <p>
              We currently support the following payment methods:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Credit/Debit Cards (Visa, Mastercard) via our secure payment gateway</li>
              <li>Bank Transfer (manual confirmation within 1–2 business days)</li>
              <li>E-Wallets (GoPay, OVO, Dana) where supported</li>
            </ul>
            <p>
              In the case of manual bank transfers, your booking will remain in <em>Pending</em> status until payment is confirmed by our team. Failure to complete payment within 24 hours may result in automatic cancellation.
            </p>
          </SectionBlock>

          <SectionBlock number="4" title="User Responsibilities">
            <p>As a customer of Bali Travel Now, you agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Arrive at the designated meeting point on time.</li>
              <li>Follow all safety instructions given by your guide or operator.</li>
              <li>Behave respectfully towards local communities, culture, and religious sites.</li>
              <li>Not engage in illegal activities or behaviors deemed harmful to others.</li>
              <li>Be physically fit for the activity booked, or disclose relevant medical conditions in advance.</li>
            </ul>
            <p>
              Bali Travel Now reserves the right to refuse service to any customer who does not comply with these responsibilities, without entitlement to a refund.
            </p>
          </SectionBlock>

          <SectionBlock number="5" title="Cancellations & Changes">
            <p>
              Cancellations and modifications are governed by our <Link href="/cancellation-policy" className="text-[#0071CE] underline hover:opacity-75">Cancellation Policy</Link>. We strongly recommend reviewing it before booking.
            </p>
            <p>
              Bali Travel Now reserves the right to modify or cancel any tour or activity due to unforeseen circumstances (e.g., extreme weather, natural disasters, or local restrictions). In such cases, you will be offered a full refund or alternative booking.
            </p>
          </SectionBlock>

          <SectionBlock number="6" title="Liability Disclaimer">
            <p>
              Bali Travel Now acts as an intermediary between customers and local tour operators. While we carefully vet all partners, we cannot be held liable for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Personal injury, illness, or death during an activity</li>
              <li>Loss or damage to personal property</li>
              <li>Delays, schedule changes, or cancellations caused by third parties</li>
              <li>Any indirect, consequential, or incidental damages</li>
            </ul>
            <p>
              Participation in all tours and activities is entirely at your own risk. We strongly advise purchasing comprehensive travel insurance before your trip.
            </p>
          </SectionBlock>

          <SectionBlock number="7" title="Intellectual Property">
            <p>
              All content on this website — including text, images, logos, and design elements — is the intellectual property of Bali Travel Now or its licensors. You may not copy, reproduce, or distribute any content without prior written permission.
            </p>
          </SectionBlock>

          <SectionBlock number="8" title="Governing Law">
            <p>
              These Terms & Conditions are governed by and construed in accordance with the laws of the <strong>Republic of Indonesia</strong>. Any disputes arising from the use of our platform or services shall be subject to the exclusive jurisdiction of the courts in <strong>Denpasar, Bali, Indonesia</strong>.
            </p>
          </SectionBlock>

          <SectionBlock number="9" title="Changes to These Terms">
            <p>
              Bali Travel Now reserves the right to update or modify these Terms & Conditions at any time. Changes will be effective immediately upon posting to the website. We recommend reviewing this page periodically. Continued use of our services after any changes constitutes your acceptance of the new terms.
            </p>
          </SectionBlock>

          <SectionBlock number="10" title="Contact Us">
            <p>
              If you have any questions about these Terms & Conditions, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-5 mt-3 space-y-2 text-sm">
              <p><strong>📧 Email:</strong> <a href="mailto:info@balitravelnow.com" className="text-[#0071CE] hover:underline">info@balitravelnow.com</a></p>
              <p><strong>💬 WhatsApp:</strong> <a href={buildWhatsAppUrl("Hello, I have a question about Terms & Conditions.")} target="_blank" rel="noopener noreferrer" className="text-[#0071CE] hover:underline">Chat with us</a></p>
              <p><strong>📍 Address:</strong> Bali, Indonesia 82121</p>
            </div>
          </SectionBlock>

        </div>
      </Container>
    </div>
  );
}
