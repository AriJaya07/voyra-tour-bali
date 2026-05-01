import { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Read the Terms of Service for using ${SITE_NAME}. Understand your rights, our role as a Bali tour discovery platform, and how bookings are processed by our trusted booking partner.`,
  alternates: { canonical: `${SITE_URL}/terms` },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Legal"
        title="Terms of Service"
        subtitle={`Please read these terms carefully before using ${SITE_NAME} or completing a booking through our platform.`}
        lastUpdated="1 May 2026"
        bannerImage="/images/terms-conditions/banner-terms.png"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-12 text-sm text-amber-800 leading-relaxed">
            <strong>Important:</strong> By accessing our website, creating an account, or initiating a booking,
            you agree to these Terms of Service. If you do not agree, please do not use our platform.
          </div>

          <SectionBlock number="1" title="Who we are">
            <p>
              <strong>{SITE_NAME}</strong> is a Bali-based travel discovery and concierge platform. We help travelers
              find, compare, and book licensed tours and activities across Bali, Indonesia. Our role is to curate
              listings, surface local insights, and connect you with a trusted global booking partner that processes
              your reservation, payment, and post-booking changes.
            </p>
            <p>
              We are not a tour operator ourselves. We do not operate vehicles, run guided tours, or handle on-site
              activity logistics. Each tour is operated by an independent licensed local provider, and the booking
              transaction is completed through a globally recognised travel marketplace partner.
            </p>
          </SectionBlock>

          <SectionBlock number="2" title="Our role vs. the booking partner">
            <p>
              When you click <strong>Book</strong> on a tour listing, you complete the reservation, payment, and
              cancellation through a secure booking widget operated by our travel marketplace partner. The partner
              handles:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Real-time availability and pricing</li>
              <li>Payment processing through PCI-DSS-compliant gateways</li>
              <li>E-voucher delivery and confirmation</li>
              <li>Cancellation, modification, and refund processing</li>
              <li>Operator coordination on the day of your activity</li>
            </ul>
            <p>
              <strong>{SITE_NAME}</strong> handles:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Tour curation, content, and editorial recommendations</li>
              <li>Account features (wishlist, recently viewed, currency preference)</li>
              <li>Local concierge support via WhatsApp before, during, and after your trip</li>
              <li>Trust & safety standards for the operators we list</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="3" title="Booking process">
            <p>To book a tour through our platform:</p>
            <ol className="list-decimal pl-5 space-y-1.5 text-gray-600">
              <li>Browse and select a tour from {SITE_NAME}.</li>
              <li>Click <strong>Book</strong> — this opens the secure booking widget from our partner.</li>
              <li>Pick your travel date, party size, and any tour-specific options.</li>
              <li>Enter traveler details and complete payment in the partner&apos;s checkout.</li>
              <li>Receive an instant e-voucher by email; access it any time from your Profile.</li>
            </ol>
            <p>
              All bookings are subject to availability and operator confirmation. Tour-specific terms (pickup zone,
              minimum age, cancellation window) are shown clearly on each product page before you book.
            </p>
          </SectionBlock>

          <SectionBlock number="4" title="Payments">
            <p>
              All payments are processed by our booking partner&apos;s PCI-DSS-compliant payment gateway. Accepted
              methods include major credit and debit cards (Visa, Mastercard, JCB, American Express, Discover) and
              other digital methods supported by the partner at checkout.
            </p>
            <p>
              {SITE_NAME} does not collect, store, or process your payment card details on its own servers.
              Prices shown on our site reflect live partner pricing and may include applicable taxes and fees.
              The currency you see on product pages can be switched in the navigation; the final charge is
              processed in the currency presented at the partner&apos;s checkout.
            </p>
          </SectionBlock>

          <SectionBlock number="5" title="Cancellations, changes & refunds">
            <p>
              Cancellation and refund rules are set by each operator and clearly displayed on every tour page.
              Most tours offer free cancellation up to 24 hours before the start time. The booking partner
              processes cancellations and refunds — see our{" "}
              <Link href="/cancellation-policy" className="text-[#0071CE] underline hover:opacity-75">
                Booking & Refunds
              </Link>{" "}
              page for the full flow.
            </p>
            <p>
              Our local concierge team can assist with rebooking, communication, and escalation if you encounter
              friction. Reach us via WhatsApp at any time.
            </p>
          </SectionBlock>

          <SectionBlock number="6" title="Your responsibilities">
            <p>By using {SITE_NAME} you agree to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Provide accurate traveler information at booking. Names must match official ID or passport.</li>
              <li>Arrive at the meeting point on time and follow operator safety instructions.</li>
              <li>Respect Balinese culture, religious sites, ceremonies, and local communities.</li>
              <li>Disclose relevant medical conditions or accessibility needs in advance where required.</li>
              <li>Not use the platform for any unlawful, abusive, or harmful purpose.</li>
            </ul>
            <p>
              Operators reserve the right to refuse service to participants who breach safety rules, pose risk to
              others, or arrive impaired. Refunds in such cases are at the operator&apos;s discretion.
            </p>
          </SectionBlock>

          <SectionBlock number="7" title="Limitation of liability">
            <p>
              {SITE_NAME} acts as an information and discovery platform. We do not control, supervise, or
              participate in the operation of any tour. While we vet the operators we list, we cannot guarantee
              outcomes during an activity. To the maximum extent permitted by law, we are not liable for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Personal injury, illness, or loss arising during participation in any tour or activity</li>
              <li>Loss, theft, or damage of personal property</li>
              <li>Delays, schedule changes, or cancellations caused by operators, weather, force majeure, or third parties</li>
              <li>Any indirect, consequential, incidental, or punitive damages</li>
            </ul>
            <p>
              Activities are taken at your own risk. We strongly recommend comprehensive travel insurance covering
              medical emergencies, trip interruption, and force majeure.
            </p>
          </SectionBlock>

          <SectionBlock number="8" title="Account security">
            <p>
              You are responsible for keeping your account credentials confidential. Use a strong, unique password.
              Notify us immediately if you suspect unauthorized access. We may suspend accounts showing signs of
              abuse, fraud, or breach of these terms.
            </p>
          </SectionBlock>

          <SectionBlock number="9" title="Intellectual property">
            <p>
              All content on this site — text, images, logos, code, and design — is owned by {SITE_NAME} or its
              licensors. Tour photos and descriptions sourced via the booking partner remain the property of the
              respective operators. You may not copy, redistribute, or scrape content without prior written
              permission.
            </p>
          </SectionBlock>

          <SectionBlock number="10" title="Force majeure">
            <p>
              Neither {SITE_NAME} nor our booking partner is liable for failure or delay caused by events outside
              reasonable control, including natural disasters, volcanic activity, severe weather, pandemics,
              government action, civil unrest, or infrastructure failure. Refunds in force majeure events are
              processed by the booking partner per the operator&apos;s policy.
            </p>
          </SectionBlock>

          <SectionBlock number="11" title="Governing law">
            <p>
              These Terms are governed by the laws of the <strong>Republic of Indonesia</strong>. Any disputes
              arising from your use of {SITE_NAME} are subject to the exclusive jurisdiction of the courts in
              <strong> Denpasar, Bali, Indonesia</strong>.
            </p>
          </SectionBlock>

          <SectionBlock number="12" title="Updates to these terms">
            <p>
              We may revise these Terms from time to time. Material changes will be reflected by an updated
              &quot;Last updated&quot; date. Continued use of {SITE_NAME} after changes constitutes acceptance.
            </p>
          </SectionBlock>

          <SectionBlock number="13" title="Contact">
            <p>Questions about these Terms? We&apos;re happy to help.</p>
            <div className="bg-gray-50 rounded-xl p-5 mt-3 space-y-2 text-sm">
              <p>
                <strong>📧 Email:</strong>{" "}
                <a href="mailto:info@balitravelnow.com" className="text-[#0071CE] hover:underline">
                  info@balitravelnow.com
                </a>
              </p>
              <p>
                <strong>💬 WhatsApp:</strong>{" "}
                <a
                  href={buildWhatsAppUrl("Hello, I have a question about the Terms of Service.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0071CE] hover:underline"
                >
                  Chat with our team
                </a>
              </p>
              <p>
                <strong>📍 Address:</strong> Bali, Indonesia 82121
              </p>
            </div>
          </SectionBlock>
        </div>
      </Container>
    </div>
  );
}
