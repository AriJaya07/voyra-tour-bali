"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaTwitter,
} from "react-icons/fa";
import VoryaIcon from "../assets/Icon/VoyraIcon";
import ViatorIcon from "../assets/footer/ViatorIcon";
import { SITE_NAME, buildWhatsAppUrl } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink {
  label: string;
  href: string;
  ready: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EXPLORE_LINKS: NavLink[] = [
  { label: "Home",             href: "/",                   ready: true  },
  { label: "About Us",         href: "/about",              ready: true  },
  { label: "Contact Us",       href: "/contact",            ready: true  },
  { label: "Bali Destinations", href: "/#destinasi",        ready: true  },
  { label: "Tour Packages",    href: "/#paket",             ready: true  },
  { label: "Blog",             href: "/blog",               ready: true  },
  { label: "Events",           href: "/events",             ready: true  },
];

const LEGAL_LINKS: NavLink[] = [
  { label: "Terms & Conditions",  href: "/terms",               ready: true  },
  { label: "Privacy Policy",      href: "/privacy",             ready: true  },
  { label: "Cancellation Policy", href: "/cancellation-policy", ready: true  },
  { label: "FAQ",                 href: "/about#faq",           ready: true  },
  { label: "How to Book",         href: "/how-to-book",         ready: false },
];

const ACCOUNT_LINKS: NavLink[] = [
  // ← replaced by dynamic <AccountLinks /> — see below
];

const SOCIAL_LINKS = [
  { name: "Facebook",  icon: FaFacebook,  href: "https://facebook.com/balitravelnow",  hoverClass: "hover:text-blue-400"  },
  { name: "Instagram", icon: FaInstagram, href: "https://instagram.com/balitravelnow", hoverClass: "hover:text-pink-400"  },
  { name: "TikTok",    icon: FaTiktok,    href: "https://tiktok.com/@balitravelnow",   hoverClass: "hover:text-white"     },
  { name: "YouTube",   icon: FaYoutube,   href: "https://youtube.com/@balitravelnow",  hoverClass: "hover:text-red-400"   },
  { name: "Twitter",   icon: FaTwitter,   href: "https://twitter.com/balitravelnow",   hoverClass: "hover:text-sky-400"   },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-14">

          {/* Col 1 — Brand */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1">
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
              <WhatsAppIcon />
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

          {/* Col 3 — Legal & Support */}
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
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>📧</span>
                <span>info@balitravelnow.com</span>
              </a>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <span>🕐</span>
                <span>Mon – Fri, 08:00 – 17:00 WITA</span>
              </p>
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <span>📍</span>
                <span>Bali, Indonesia</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── NEWSLETTER ────────────────────────────────────────────── */}
        <div className="bg-zinc-800/40 border border-zinc-800 rounded-2xl p-6 lg:p-8 mb-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
            className="flex w-full md:w-auto gap-2"
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

        {/* ── BOTTOM BAR ────────────────────────────────────────────── */}
        <div className="border-t border-zinc-800 pt-8 space-y-6">

          {/* Viator badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <p className="text-sm text-gray-500 font-medium">
              Tours and activities powered by
            </p>
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex items-center justify-center shadow-sm">
              <ViatorIcon className="w-20 h-10 object-contain" />
            </div>
          </div>

          {/* Quick legal links */}
          <nav
            aria-label="Footer legal navigation"
            className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-gray-500"
          >
            <Link href="/about"               className="hover:text-white transition-colors">About</Link>
            <Dot />
            <Link href="/contact"             className="hover:text-white transition-colors">Contact</Link>
            <Dot />
            <Link href="/terms"               className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            <Dot />
            <Link href="/privacy"             className="hover:text-white transition-colors">Privacy Policy</Link>
            <Dot />
            <Link href="/cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link>
            <Dot />
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact us on WhatsApp"
              className="inline-flex items-center gap-1.5 hover:text-green-400 transition-colors"
            >
              <WhatsAppIcon className="w-3 h-3" />
              WhatsApp
            </a>
          </nav>

          {/* Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 border-t border-zinc-800 pt-6">
            <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
            <p>Made with ❤️ in Bali, Indonesia 🇮🇩</p>
          </div>
        </div>

      </div>
    </footer>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Dot() {
  return <span className="opacity-20 select-none">·</span>;
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}