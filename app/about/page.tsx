"use client";

import { useState } from "react";
import Link from "next/link";


// ── FAQ Data ────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "What is Voyra Tourism?",
    answer:
      "Voyra Tourism is a Bali-based travel platform that connects travelers with curated destinations, tour packages, and unique cultural experiences across the island. We partner with local guides and trusted operators to deliver authentic, memorable journeys.",
  },
  {
    question: "How do I book a tour or package?",
    answer:
      "Simply browse our destinations or tour packages, select the one you like, choose your preferred date and number of guests, then click 'Book & Pay Now'. You'll be redirected to our secure payment page powered by Midtrans. Once payment is confirmed, you'll receive a booking reference.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept a wide range of payment methods through Midtrans, including bank transfers (BCA, BNI, BRI, Mandiri), credit/debit cards (Visa, Mastercard), e-wallets (GoPay, OVO, Dana, ShopeePay), and convenience store payments (Indomaret, Alfamart).",
  },
  {
    question: "Can I cancel or reschedule my booking?",
    answer:
      "Yes, you can request a cancellation or reschedule through your profile page or by contacting us via WhatsApp. Cancellation policies vary depending on the tour operator and how close to the travel date the request is made. We recommend reaching out at least 48 hours in advance.",
  },
  {
    question: "Is it safe to travel in Bali?",
    answer:
      "Bali is one of the safest destinations in Southeast Asia for tourists. We work exclusively with licensed, insured tour operators and provide 24/7 customer support during your trip. We also recommend purchasing travel insurance for added peace of mind.",
  },
  {
    question: "Do you offer group or private tours?",
    answer:
      "Yes! Many of our packages offer both shared group tours and private options. Private tours can be customized to your preferences — just reach out via WhatsApp and our team will help tailor the perfect itinerary for you.",
  },
  {
    question: "How do I contact Voyra for support?",
    answer:
      "You can reach us via WhatsApp for quick responses, or through the Contact Us link in the footer. Our support team is available daily from 8 AM to 10 PM Bali time (WITA).",
  },
];

// ── About Page ──────────────────────────────────────────────────────────
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#0071CE] via-[#005ba6] to-[#003d73] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-4">
            About Us
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Discover Bali <br className="hidden sm:block" />
            with <span className="text-cyan-300">Voyra</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Your trusted travel companion for exploring the beauty, culture, and
            adventure that Bali has to offer.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/#destinasi"
              className="px-8 py-3.5 bg-white text-[#0071CE] font-bold rounded-full hover:bg-blue-50 transition shadow-lg text-sm"
            >
              Explore Destinations
            </Link>
            <Link
              href="/#paket"
              className="px-8 py-3.5 bg-white/15 text-white font-bold rounded-full hover:bg-white/25 transition border border-white/30 text-sm"
            >
              View Packages
            </Link>
          </div>
        </div>
      </section>

      {/* Mission / What We Do */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-bold text-[#0071CE] uppercase tracking-widest mb-3">
              Our Mission
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
              Making Bali accessible to every traveler
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed">
              Voyra Tourism was founded with a simple belief: every traveler
              deserves an authentic Bali experience without the hassle of
              planning. We bridge the gap between travelers and Bali's rich
              culture, stunning landscapes, and warm hospitality.
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">
              From the terraced rice fields of Ubud to the crystal-clear waters
              of Nusa Penida, our curated destinations and tour packages are
              designed to give you the best of Bali — whether you're a
              first-time visitor or a seasoned explorer.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard value="500+" label="Happy Travelers" icon="🌏" />
            <StatCard value="50+" label="Destinations" icon="📍" />
            <StatCard value="30+" label="Tour Packages" icon="📦" />
            <StatCard value="24/7" label="Customer Support" icon="💬" />
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-[#0071CE] uppercase tracking-widest mb-3">
              Why Choose Us
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
              What makes Voyra different
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon="🎯"
              title="Curated Experiences"
              description="Every destination and package is hand-picked and vetted by our local team to ensure quality and authenticity."
            />
            <FeatureCard
              icon="💳"
              title="Secure Payments"
              description="Book with confidence through our Midtrans-powered payment system supporting cards, e-wallets, and bank transfers."
            />
            <FeatureCard
              icon="🤝"
              title="Local Expertise"
              description="We work directly with Balinese guides and operators who share their deep knowledge and passion for the island."
            />
            <FeatureCard
              icon="📱"
              title="Easy Booking"
              description="Browse, select, and book in just a few clicks. Track your bookings anytime from your profile dashboard."
            />
            <FeatureCard
              icon="💬"
              title="WhatsApp Support"
              description="Prefer to chat? Reach us instantly via WhatsApp for personalized recommendations and booking assistance."
            />
            <FeatureCard
              icon="🔒"
              title="Flexible Cancellation"
              description="Plans change — we get it. Most of our packages offer free cancellation up to 48 hours before your trip."
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-[#0071CE] uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-gray-500">
            Everything you need to know about traveling with Voyra.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[#0071CE] to-[#005ba6] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Ready to explore Bali?
          </h2>
          <p className="text-blue-100 mb-8 text-lg">
            Start your journey today and discover unforgettable experiences.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/#destinasi"
              className="px-8 py-3.5 bg-white text-[#0071CE] font-bold rounded-full hover:bg-blue-50 transition shadow-lg text-sm"
            >
              Browse Destinations
            </Link>
            <Link
              href="/register"
              className="px-8 py-3.5 bg-white/15 text-white font-bold rounded-full hover:bg-white/25 transition border border-white/30 text-sm"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-shadow">
      <span className="text-3xl mb-2 block">{icon}</span>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <span className="text-3xl mb-4 block">{icon}</span>
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`border rounded-2xl transition-all duration-300 ${
        open
          ? "border-[#0071CE]/30 bg-blue-50/30 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
      >
        <span
          className={`text-sm sm:text-base font-semibold pr-4 transition-colors duration-200 ${
            open ? "text-[#0071CE]" : "text-gray-900"
          }`}
        >
          {question}
        </span>
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            open
              ? "bg-[#0071CE] text-white rotate-180"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* Animated answer container */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-5 text-sm text-gray-600 leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
