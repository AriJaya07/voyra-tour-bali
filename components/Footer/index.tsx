"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import FacebookIcon from "../assets/sosmed/FacebookIcon";
import InstagramIcon from "../assets/sosmed/InstagramIcon";
import TiktokIcon from "../assets/sosmed/TiktokIcon";
import YoutubeIcon from "../assets/sosmed/YoutubeIcon";
import TwitterIcon from "../assets/sosmed/TwitterIcon";
import WhatsAppIcon from "../assets/sosmed/WhatsAppIcon";
import VoryaIcon from "../assets/Icon/VoyraIcon";
import { SITE_NAME, buildWhatsAppUrl } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
  ready: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EXPLORE_LINKS: NavLink[] = [
  { label: "Home",              href: "/",               ready: true },
  { label: "Bali Destinations", href: "/#destinasi",     ready: true },
  { label: "Tour Packages",     href: "/#paket",         ready: true },
  { label: "Travel Guides",     href: "/guides",         ready: true },
  { label: "Blog",              href: "/blog",           ready: true },
  { label: "Events",            href: "/events",         ready: true },
  { label: "List Your Tours",   href: "/operator/apply", ready: true },
];

const PARTNER_URL = "https://agency.balitravelnow.com/";

const AI_LINKS: NavLink[] = [
  { label: "AI Tools (Hub)",    href: "/ai",          ready: true },
  { label: "Plan a Trip",       href: "/ai/plan",     ready: true },
  { label: "Pricing & Credits", href: "/ai/pricing",  ready: true },
  { label: "AI Wallet",         href: "/ai/wallet",   ready: true },
  { label: "My Trips",          href: "/trips",       ready: true },
];

const LEGAL_LINKS: NavLink[] = [
  { label: "Help Center",       href: "/help",                ready: true },
  { label: "About Us",          href: "/about",               ready: true },
  { label: "Contact Us",        href: "/contact",             ready: true },
  { label: "Trust & Safety",    href: "/trust-and-safety",    ready: true },
  { label: "Booking & Refunds", href: "/cancellation-policy", ready: true },
  { label: "Terms of Service",  href: "/terms",               ready: true },
  { label: "Privacy Policy",    href: "/privacy",             ready: true },
  { label: "Status",            href: "/status",              ready: true },
];

const ACCOUNT_LINKS: NavLink[] = [
  // ← replaced by dynamic <AccountLinks /> — see below
];

const SOCIAL_LINKS = [
  // { name: "Facebook",  icon: FacebookIcon,  href: "https://facebook.com/balitravelnow",  hoverClass: "hover:text-blue-400"  },
  { name: "Instagram", icon: InstagramIcon, href: "https://www.instagram.com/voyra_bali_adventure", hoverClass: "hover:text-pink-400"  },
  // { name: "TikTok",    icon: TiktokIcon,    href: "https://tiktok.com/@balitravelnow",   hoverClass: "hover:text-white"  },
  // { name: "YouTube",   icon: YoutubeIcon,   href: "https://youtube.com/@balitravelnow",  hoverClass: "hover:text-red-400"   },
  // { name: "Twitter",   icon: TwitterIcon,   href: "https://twitter.com/balitravelnow",   hoverClass: "hover:text-sky-400"   },   
];

const WHATSAPP_URL = buildWhatsAppUrl();

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Renders a nav link — shows "Coming Soon" badge if not ready */
function FooterLink({ label, href, ready }: NavLink) {
  if (!ready) {
    return (
      <li>
        <span
          className="flex items-center gap-2 text-sm text-gray-600 cursor-default select-none"
          title={`${label} — Coming Soon`}
          aria-disabled="true"
        >
          {label}
          <span className="text-[10px] font-bold uppercase tracking-wide bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded-full leading-none">
            Soon
          </span>
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="text-sm text-gray-400 hover:text-white transition-colors duration-200"
      >
        {label}
      </Link>
    </li>
  );
}

/** Column heading */
function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-white font-semibold text-xs uppercase tracking-widest mb-5">
      {children}
    </h3>
  );
}
// ─── Session-aware Account Links ─────────────────────────────────────────────

/**
 * Renders the "My Account" column links based on auth state:
 * - Logged out  → Sign In, Register
 * - Logged in   → My Profile
 * - Role=ADMIN  → My Profile + Dashboard
 */
function AccountLinks() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isAdmin    = (session?.user as any)?.role === "ADMIN";

  if (status === "loading") {
    // Skeleton while session loads — avoids layout shift
    return (
      <ul className="space-y-3.5">
        {[1, 2].map((i) => (
          <li key={i}>
            <span className="inline-block h-4 w-24 bg-zinc-800 rounded animate-pulse" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-3.5">
      {!isLoggedIn ? (
        // ── Guest ─────────────────────────────────────────────
        <>
          <li>
            <Link href="/login"    className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</Link>
          </li>
          <li>
            <Link href="/register" className="text-sm text-gray-400 hover:text-white transition-colors">Register</Link>
          </li>
        </>
      ) : (
        // ── Authenticated ──────────────────────────────────────
        <>
          <li>
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors">My Profile</Link>
          </li>
          {isAdmin && (
            <li>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Dashboard
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#F06400]/20 text-[#F06400] px-1.5 py-0.5 rounded-full leading-none">
                  Admin
                </span>
              </Link>
            </li>
          )}
        </>
      )}
    </ul>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Footer() {
  const [email, setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setMessage(null);

    try {
      const res  = await fetch("/api/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setEmail("");
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-zinc-900 text-gray-400 font-sans print:hidden">
      {/* Top accent line */}
      <div className="h-1 w-full bg-[#F06400]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">

        {/* ── MAIN GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-10 mb-14">

          {/* Col 1 — Brand */}
          <div className="space-y-5 col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Go to homepage" className="inline-block">
              <div className="text-white">
                <VoryaIcon className="w-32 h-auto" />
              </div>
            </Link>

            <p className="text-sm leading-relaxed max-w-xs">
              Your local Bali travel partner — curated tours, seamless booking,
              and authentic island experiences.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-4 pt-1">
              {SOCIAL_LINKS.map(({ name, icon: Icon, href, hoverClass }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Follow us on ${name}`}
                  className={`text-gray-500 transition-colors duration-200 ${hoverClass}`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with us on WhatsApp"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors w-fit mt-1"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Chat on WhatsApp
            </a>
          </div>

          {/* Col 2 — Explore */}
          <div>
            <ColHeading>Explore</ColHeading>
            <ul className="space-y-3.5">
              {EXPLORE_LINKS.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Col 3 — AI Tools */}
          <div>
            <ColHeading>AI Tools</ColHeading>
            <ul className="space-y-3.5">
              {AI_LINKS.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Col 4 — Legal & Support */}
          <div>
            <ColHeading>Legal & Support</ColHeading>
            <ul className="space-y-3.5">
              {LEGAL_LINKS.map((link) => (
                <FooterLink key={link.label} {...link} />
              ))}
            </ul>
          </div>

          {/* Col 4 — Account */}
          <div>
            <ColHeading>My Account</ColHeading>
            <AccountLinks />

            {/* Contact info */}
            <div className="mt-8 space-y-2.5">
              <ColHeading>Contact</ColHeading>
              <a
                href="mailto:info@balitravelnow.com"
                className="flex items-start gap-2 text-xs sm:text-[13px] text-gray-400 hover:text-white transition-colors leading-snug break-all"
              >
                <span className="flex-shrink-0 mt-0.5">📧</span>
                <span>info@balitravelnow.com</span>
              </a>
              <div className="flex items-start gap-2 text-xs sm:text-[13px] text-gray-500 leading-snug">
                <span className="flex-shrink-0 mt-0.5">🕐</span>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-400">Mon – Fri</span>
                  <span className="tabular-nums">08:00 – 17:00 WITA</span>
                </div>
              </div>
              <p className="flex items-start gap-2 text-xs sm:text-[13px] text-gray-500 leading-snug">
                <span className="flex-shrink-0 mt-0.5">📍</span>
                <span>Bali, Indonesia</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── NEWSLETTER + PARTNER ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 bg-zinc-800/40 border border-zinc-800 rounded-2xl overflow-hidden mb-14">

          {/* Partner CTA */}
          <a
            href={PARTNER_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Become our partner — opens balitravelnow agency in a new tab"
            className="group relative overflow-hidden flex flex-col justify-between gap-5 p-6 lg:p-8 transition-colors duration-300 hover:bg-zinc-800/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F06400]"
          >
            <div className="relative flex items-start gap-4">
              <span className="flex-shrink-0 grid place-items-center h-12 w-12 rounded-2xl bg-[#F06400]/20 text-2xl shadow-[0_0_24px_-6px_rgba(240,100,0,0.6)]">
                🤝
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-lg leading-tight">
                    Become Our Partner
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-[#F06400]/20 text-[#F06400] px-2 py-0.5 rounded-full leading-none">
                    Agency
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Grow your travel business with us. Join the balitravelnow
                  agency network and start earning commissions today.
                </p>
              </div>
            </div>

            <span className="relative inline-flex items-center justify-center gap-2 bg-[#F06400] group-hover:bg-orange-600 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors w-full shadow-lg shadow-[#F06400]/20">
              Become a Partner
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 10h10M11 5l5 5-5 5" />
              </svg>
            </span>
          </a>

          {/* Newsletter */}
          <div className="p-6 lg:p-8 flex flex-col justify-between gap-5">
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">
                Stay updated with Bali travel tips
              </h3>
              <p className="text-sm text-gray-400">
                Join our newsletter for exclusive offers and hidden gems.
              </p>
              {message && (
                <p
                  className={`text-sm mt-2 font-semibold ${
                    message.type === "success" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {message.text}
                </p>
              )}
            </div>

            <form
              onSubmit={handleSubscribe}
              className="flex w-full gap-2"
              aria-label="Newsletter subscription form"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                required
                aria-label="Your email address"
                className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#0071CE] focus:border-transparent transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-[#F06400] hover:bg-orange-600 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {loading ? "Please wait…" : "Subscribe"}
              </button>
            </form>
          </div>
        </div>

        {/* ── COPYRIGHT ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 border-t border-zinc-800 pt-8">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p>Made with ❤️ in Bali, Indonesia 🇮🇩</p>
        </div>

      </div>
    </footer>
  );
}


