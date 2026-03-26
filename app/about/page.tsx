"use client";

import Link from "next/link";
import { StatCard, FeatureCard, FaqItem } from "@/components/about";
import { FAQ_ITEMS } from "@/lib/data/about";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/about-us/about-banner.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0071CE]/80 to-[#004a8a]/60" />
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 sm:py-24 text-center">
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
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/about-us/about-visit.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0071CE]/60 to-[#004a8a]/85" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
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
