import { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL, buildWhatsAppUrl } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Learn how ${SITE_NAME} collects, uses, and protects your personal data. We never sell your data and only share what is needed to run your booking.`,
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Privacy"
        title="Privacy Policy"
        subtitle="Your privacy is core to our product. This page explains exactly what we collect, why, and what we never do with your data."
        lastUpdated="1 May 2026"
        bannerImage="/images/privacy-policy/banner-privacy.png"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-12 text-sm text-blue-800 leading-relaxed">
            <strong>Plain summary:</strong> We collect only what we need to run your account and your booking.
            We never sell your data. We never share more than the operator needs to deliver your tour.
            You can request a copy or deletion of your data any time.
          </div>

          <SectionBlock number="1" title="Who we are">
            <p>
              <strong>{SITE_NAME}</strong> is a Bali-based travel discovery and concierge platform operating at{" "}
              <a href={SITE_URL} className="text-[#0071CE] underline">{SITE_URL.replace(/^https?:\/\//, "")}</a>.
              For data-protection purposes, {SITE_NAME} is the data controller for personal information collected
              through our website and account features.
            </p>
            <p>
              When you book a tour, the booking transaction and payment are processed by a globally trusted travel
              marketplace partner. The partner acts as an independent data controller for the booking transaction
              itself; their privacy notice applies to data you enter into their checkout (see Section 5).
            </p>
          </SectionBlock>

          <SectionBlock number="2" title="What we collect">
            <p>We collect data in four buckets:</p>
            <div className="space-y-4 mt-2">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">👤 Account & identity</p>
                <p className="text-sm text-gray-600">
                  Name, email, phone (optional), avatar URL (if you sign in with Google), bcrypt-hashed password.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">⭐ Personalization</p>
                <p className="text-sm text-gray-600">
                  Wishlist, recently-viewed tours (auto-cleared after 24 hours), currency preference, saved-traveler
                  profiles you choose to add for faster checkout. Stored only when you are signed in.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">📅 Booking metadata</p>
                <p className="text-sm text-gray-600">
                  Booking reference, tour, date, party size, status — used to display your trips in your Profile and
                  send reminder emails. Card details and full traveler PII are held by the booking partner, not us.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">🔧 Technical data</p>
                <p className="text-sm text-gray-600">
                  IP address, browser, device, pages visited (for analytics and abuse prevention). Aggregated,
                  not used to profile individuals.
                </p>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock number="3" title="How we use your data">
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Run your account:</strong> Sign-in, profile, password reset, email verification.</li>
              <li><strong>Show your trips:</strong> Display bookings, voucher links, and trip reminders in your Profile.</li>
              <li><strong>Personalize:</strong> Remember your wishlist, recently viewed, and currency preference across devices.</li>
              <li><strong>Concierge support:</strong> Help you via WhatsApp or email when you ask for it.</li>
              <li><strong>Marketing (opt-in):</strong> Send Bali tips and offers <em>only</em> if you subscribe. One-click unsubscribe in every email.</li>
              <li><strong>Improve the product:</strong> Aggregate analytics on which tours travelers find useful.</li>
              <li><strong>Legal compliance:</strong> Meet Indonesian tax and consumer-protection rules.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="4" title="What we do NOT do">
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>We never sell, rent, or trade your personal data.</li>
              <li>We never run third-party ad pixels that profile you across the web.</li>
              <li>We never store your payment card details on our servers.</li>
              <li>We never email you marketing content unless you opt in.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="5" title="Third-party services">
            <p>We use the following partners — each with a narrow, named purpose:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>
                <strong>Booking & payment partner:</strong> A globally trusted travel-marketplace platform that
                handles your reservation, payment, and refund. Card details are entered into their PCI-DSS-compliant
                checkout, never on our servers.
              </li>
              <li>
                <strong>Sign-in providers:</strong> If you sign in with Google, your email and avatar are received
                via OAuth — only what Google&apos;s consent screen shows.
              </li>
              <li>
                <strong>Email delivery:</strong> A transactional-email provider sends booking confirmations,
                password resets, and trip reminders.
              </li>
              <li>
                <strong>Analytics:</strong> Aggregated, IP-anonymized analytics for understanding which pages and
                tours are useful. No cross-site profiling.
              </li>
              <li>
                <strong>AI assistant:</strong> Your chat input is sent to a language-model provider to generate the
                response. Not used for ad targeting; not stored long-term against your identity.
              </li>
              <li>
                <strong>Cloud storage:</strong> Tour photos, review photos, and avatars are served from a cloud
                object store with signed URLs.
              </li>
            </ul>
            <p>
              We share only what each partner needs to do its job. We do not provide blanket data access.
            </p>
          </SectionBlock>

          <SectionBlock number="6" title="What the operator sees">
            <p>
              When you book a specific tour, the operator running that tour receives the minimum information needed
              to deliver it: lead-traveler name and contact, party size, pickup info if applicable, and any
              tour-specific answers you provided at checkout. Operators cannot browse other travelers&apos; data.
            </p>
          </SectionBlock>

          <SectionBlock number="7" title="Data retention">
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Account data:</strong> Kept while your account is active. Delete on request.</li>
              <li><strong>Booking records:</strong> Kept ~5 years for tax and consumer-protection compliance.</li>
              <li><strong>Recently-viewed:</strong> Auto-deleted after 24 hours.</li>
              <li><strong>Wishlist & saved travelers:</strong> Kept until you remove them or delete your account.</li>
              <li><strong>Email subscriptions:</strong> Until you unsubscribe.</li>
              <li><strong>Single-use tokens (verify, password reset):</strong> Cleared as soon as used.</li>
              <li><strong>Payment-flow tokens (snapToken, idempotencyKey):</strong> Cleared once a booking is confirmed.</li>
              <li><strong>Logs:</strong> Aggregated technical logs retained ~30 days.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="8" title="Security">
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>HTTPS / TLS 1.2+ encryption on every page</li>
              <li>Bcrypt password hashing</li>
              <li>Login lockout after repeated failed attempts</li>
              <li>Card details handled exclusively by our PCI-DSS-compliant payment partner — never stored on our servers</li>
              <li>Quarterly access review and least-privilege engineering</li>
              <li>Secrets stored in encrypted environment, not source code</li>
            </ul>
            <p>No system is 100% impenetrable; use a strong unique password and enable Google sign-in if available.</p>
          </SectionBlock>

          <SectionBlock number="9" title="Your rights">
            <p>You can ask us to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Access:</strong> Send you a copy of the data we hold about you.</li>
              <li><strong>Correct:</strong> Fix any inaccurate or incomplete details.</li>
              <li><strong>Delete:</strong> Remove your account and personal data (booking records may be retained for legal-compliance reasons; we will tell you what stays and why).</li>
              <li><strong>Port:</strong> Receive your data in a portable format.</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing instantly.</li>
              <li><strong>Withdraw consent:</strong> For anything you previously opted into.</li>
            </ul>
            <p>
              Email{" "}
              <a href="mailto:info@balitravelnow.com" className="text-[#0071CE] hover:underline">
                info@balitravelnow.com
              </a>{" "}
              with your request. We respond within 14 days.
            </p>
          </SectionBlock>

          <SectionBlock number="10" title="Cookies">
            <p>We use the minimum cookies needed:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Essential:</strong> Sign-in session, security, CSRF protection. Cannot be disabled.</li>
              <li><strong>Analytics:</strong> Aggregated, IP-anonymized usage measurement. Disable via your browser if you prefer.</li>
            </ul>
            <p>We do not run third-party advertising cookies.</p>
          </SectionBlock>

          <SectionBlock number="11" title="Children">
            <p>
              Our services are not directed to children under 16. Bookings should be made by an adult; child
              participants are listed under the lead traveler.
            </p>
          </SectionBlock>

          <SectionBlock number="12" title="International data transfer">
            <p>
              Some of our service partners (e.g. cloud storage, email, the booking marketplace) operate outside
              Indonesia. Data is transferred under standard contractual safeguards and encrypted in transit.
            </p>
          </SectionBlock>

          <SectionBlock number="13" title="Updates to this policy">
            <p>
              We may update this Privacy Policy. Material changes are reflected in the &quot;Last updated&quot;
              date. Continued use after a change indicates acceptance of the updated policy.
            </p>
          </SectionBlock>

          <SectionBlock number="14" title="Contact">
            <p>For privacy questions, data requests, or concerns:</p>
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
                  href={buildWhatsAppUrl("Hello, I have a privacy question.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0071CE] hover:underline"
                >
                  Chat with us
                </a>
              </p>
              <p>
                <strong>📍 Address:</strong> Bali, Indonesia 82121
              </p>
              <p className="pt-2">
                See also: <Link href="/trust-and-safety" className="text-[#0071CE] hover:underline">Trust & Safety</Link>{" "}
                · <Link href="/terms" className="text-[#0071CE] hover:underline">Terms of Service</Link>{" "}
                · <Link href="/cancellation-policy" className="text-[#0071CE] hover:underline">Booking & Refunds</Link>
              </p>
            </div>
          </SectionBlock>
        </div>
      </Container>
    </div>
  );
}
