import { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import PageHero from "@/components/legal/PageHero";
import SectionBlock from "@/components/legal/SectionBlock";
import Container from "@/components/Container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Learn how ${SITE_NAME} collects, uses, and protects your personal data when you book tours and activities in Bali.`,
  robots: { index: true, follow: true },
  alternates: { canonical: `${SITE_URL}/privacy` },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PageHero
        badge="Privacy"
        title="Privacy Policy"
        subtitle="Your privacy is important to us. This policy explains how we collect, use, and protect your personal information."
        lastUpdated="1 April 2025"
      />

      <Container>
        <div className="max-w-3xl mx-auto py-14 sm:py-20">

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-12 text-sm text-blue-800 leading-relaxed">
            <strong>Summary:</strong> We collect only what we need to provide you with the best travel experience. We never sell your data. This policy explains exactly what we collect and how we use it.
          </div>

          <SectionBlock number="1" title="Who We Are">
            <p>
              <strong>Bali Travel Now</strong> (balitravelnow.com) is a travel agency based in Bali, Indonesia. We operate an online platform where travelers can discover, browse, and book tours and activities across Bali. For the purposes of data protection law, Bali Travel Now is the data controller responsible for your personal information.
            </p>
          </SectionBlock>

          <SectionBlock number="2" title="What Data We Collect">
            <p>We collect the following categories of personal data:</p>
            <div className="space-y-4 mt-2">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">👤 Account & Identity Data</p>
                <p>Full name, email address, password (encrypted), and account registration details.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">📅 Booking Data</p>
                <p>Tour selections, travel dates, number of travelers, special requirements, and booking history.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">💬 Communication Data</p>
                <p>WhatsApp contact number (when provided), email correspondence, and inquiry messages.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800 mb-1">🔧 Technical Data</p>
                <p>IP address, browser type, device information, and pages visited (collected via Google Analytics).</p>
              </div>
            </div>
          </SectionBlock>

          <SectionBlock number="3" title="How We Use Your Data">
            <p>We use your personal data for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Booking Processing:</strong> To confirm, manage, and fulfill your tour bookings.</li>
              <li><strong>Customer Communication:</strong> To send booking confirmations, reminders, updates, and respond to inquiries via email or WhatsApp.</li>
              <li><strong>Account Management:</strong> To provide and maintain your user account on our platform.</li>
              <li><strong>Marketing (opt-in only):</strong> To send newsletters and promotional offers if you have subscribed. You can unsubscribe at any time.</li>
              <li><strong>Service Improvement:</strong> To analyze usage patterns and improve our website and services.</li>
              <li><strong>Legal Compliance:</strong> To comply with applicable Indonesian laws and regulations.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="4" title="Third-Party Services">
            <p>We work with trusted third-party services to operate our platform. These include:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Viator (TripAdvisor):</strong> We display tour products and availability from Viator's affiliate API. Viator's own privacy policy applies to data processed through their platform.</li>
              <li><strong>Payment Gateways:</strong> Payments are processed securely through our payment provider. We do not store full card details on our servers.</li>
              <li><strong>Google Analytics:</strong> We use Google Analytics to understand website traffic and usage. Data is anonymized and aggregated.</li>
              <li><strong>Email Services:</strong> We use a transactional email provider (SMTP) to send confirmations and notifications.</li>
            </ul>
            <p>We do not sell your personal data to any third parties. We only share data with partners who require it strictly to provide services on our behalf.</p>
          </SectionBlock>

          <SectionBlock number="5" title="Data Retention">
            <p>
              We retain your personal data for as long as necessary to fulfill the purposes described in this policy, or as required by Indonesian law. Specifically:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>Account data is retained as long as you maintain an active account.</li>
              <li>Booking records are kept for a minimum of 5 years for tax and legal compliance.</li>
              <li>Marketing preferences and email subscriptions are maintained until you unsubscribe.</li>
            </ul>
          </SectionBlock>

          <SectionBlock number="6" title="Data Security">
            <p>
              We take the protection of your personal data seriously and implement industry-standard security measures including:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li>HTTPS encryption on all web pages and API communications</li>
              <li>Bcrypt password hashing for all user passwords</li>
              <li>Restricted access to personal data on a need-to-know basis</li>
              <li>Regular security reviews of our platform</li>
            </ul>
            <p>
              While we implement best practices, no method of transmission over the internet is 100% secure. We encourage you to use a strong, unique password for your account.
            </p>
          </SectionBlock>

          <SectionBlock number="7" title="Your Rights">
            <p>Under applicable data protection laws, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and personal data.</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time.</li>
            </ul>
            <p>To exercise any of these rights, please contact us at <a href="mailto:info@balitravelnow.com" className="text-[#0071CE] hover:underline">info@balitravelnow.com</a>.</p>
          </SectionBlock>

          <SectionBlock number="8" title="Cookies">
            <p>
              Our website uses cookies to enhance your browsing experience. Cookies are small text files stored on your device. We use:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
              <li><strong>Essential cookies:</strong> Required for core website functionality (e.g., session management).</li>
              <li><strong>Analytics cookies:</strong> Help us understand how visitors use our site (Google Analytics).</li>
            </ul>
            <p>You can control cookie preferences through your browser settings.</p>
          </SectionBlock>

          <SectionBlock number="9" title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page. We encourage you to review it periodically. Continued use of our services after changes constitutes your acceptance.
            </p>
          </SectionBlock>

          <SectionBlock number="10" title="Contact Us">
            <p>For any privacy-related questions or requests, please contact us:</p>
            <div className="bg-gray-50 rounded-xl p-5 mt-3 space-y-2 text-sm">
              <p><strong>📧 Email:</strong> <a href="mailto:info@balitravelnow.com" className="text-[#0071CE] hover:underline">info@balitravelnow.com</a></p>
              <p><strong>💬 WhatsApp:</strong> <a href="https://wa.me/6281234567890?text=Hello%2C+I+have+a+privacy+inquiry." target="_blank" rel="noopener noreferrer" className="text-[#0071CE] hover:underline">Chat with us</a></p>
              <p><strong>📍 Address:</strong> Bali, Indonesia 82121</p>
            </div>
          </SectionBlock>

        </div>
      </Container>
    </div>
  );
}
