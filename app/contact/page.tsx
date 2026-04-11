"use client";

import { useState } from "react";
import PageHero from "@/components/legal/PageHero";
import Container from "@/components/Container";
import { buildWhatsAppUrl } from "@/lib/config";
import { CheckmarkIcon, ChevronRightIcon } from "@/components/assets/Icon/shared";
import WhatsAppIcon from "@/components/assets/sosmed/WhatsAppIcon";



interface FormState {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const SUBJECTS = [
  "General Inquiry",
  "Booking Question",
  "Cancellation Request",
  "Partnership / Affiliate",
  "Technical Support",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      } else {
        const data = await res.json();
        setErrorMsg(data?.error || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  const whatsappUrl = buildWhatsAppUrl(
    form.message.trim()
      ? `Hello, my name is ${form.name}. ${form.message}`
      : undefined
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHero
        badge="Contact"
        title="We'd Love to Hear From You"
        subtitle="Have a question about a tour, need help with a booking, or just want to say hello? We're here for you."
      />

      <Container>
        <div className="max-w-5xl mx-auto py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* ── Left: Contact Info ───────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Get in Touch</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Our team is based in Bali and available daily from <strong>08:00 – 20:00 WITA</strong>. We typically respond within a few hours.
                </p>
              </div>

              {/* WhatsApp CTA */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl p-5 transition-colors shadow-sm group"
              >
                <div className="shrink-0 w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <WhatsAppIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-sm">Chat on WhatsApp</p>
                  <p className="text-green-100 text-xs mt-0.5">Fastest response · Typically within 1 hour</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Contact Details */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-sm">
                <ContactDetail icon="📧" label="Email" value="info@balitravelnow.com" href="mailto:info@balitravelnow.com" />
                <ContactDetail icon="📍" label="Address" value="Bali, Indonesia" />
                <ContactDetail icon="🕐" label="Office Hours" value="Monday – Friday, 08:00 – 17:00 WITA" />
              </div>

              {/* FAQ link */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                <p className="text-sm text-blue-800 font-semibold mb-1">Looking for quick answers?</p>
                <p className="text-sm text-blue-700">Check our <a href="/about#faq" className="underline font-medium">FAQ section</a> — you might find your answer instantly.</p>
              </div>

            </div>

            {/* ── Right: Contact Form ──────────────────────── */}
            <div className="lg:col-span-3">
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-gray-400 text-sm mb-6">We&apos;ll get back to you via email within 24 hours.</p>

                {status === "success" ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckmarkIcon className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">Message Sent!</h3>
                    <p className="text-gray-500 text-sm mb-6">Thank you for reaching out. We'll reply to your email within 24 hours.</p>
                    <button
                      onClick={() => setStatus("idle")}
                      className="text-[#0071CE] text-sm font-semibold hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FormField label="Full Name" required>
                        <input
                          type="text"
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          placeholder="e.g. John Doe"
                          required
                          className={INPUT_CLASS}
                        />
                      </FormField>
                      <FormField label="Email Address" required>
                        <input
                          type="email"
                          name="email"
                          value={form.email}
                          onChange={handleChange}
                          placeholder="e.g. email@yourdomain.com"
                          required
                          className={INPUT_CLASS}
                        />
                      </FormField>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FormField label="WhatsApp / Phone">
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="+62 812 3456 7890"
                          className={INPUT_CLASS}
                        />
                      </FormField>
                      <FormField label="Subject" required>
                        <select
                          name="subject"
                          value={form.subject}
                          onChange={handleChange}
                          required
                          className={INPUT_CLASS}
                        >
                          <option value="">Select a subject</option>
                          {SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    <FormField label="Your Message" required>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        rows={5}
                        placeholder="Tell us how we can help you..."
                        required
                        className={`${INPUT_CLASS} resize-none`}
                      />
                    </FormField>

                    {status === "error" && (
                      <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                        {errorMsg}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="flex-1 bg-[#0071CE] hover:bg-[#005bb5] text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                      >
                        {status === "loading" ? "Sending…" : "Send Message"}
                      </button>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-colors text-sm"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </div>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </Container>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full bg-gray-50 border border-gray-200 focus:border-[#0071CE] focus:ring-2 focus:ring-[#0071CE]/20 text-gray-800 placeholder-gray-400 text-sm rounded-xl px-4 py-3 outline-none transition-all";

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ContactDetail({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        {href ? (
          <a href={href} className="text-sm text-[#0071CE] hover:underline font-medium">{value}</a>
        ) : (
          <p className="text-sm text-gray-700 font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}
