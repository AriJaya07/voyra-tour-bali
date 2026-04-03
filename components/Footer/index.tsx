"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaTwitter,
  FaTelegramPlane
} from 'react-icons/fa';
import { SITE_NAME } from '@/lib/config';

import VoryaIcon from '../assets/Icon/VoyraIcon';
import ViatorIcon from '../assets/footer/ViatorIcon';

// --- DATA STRUCTURES ---

const footerLinks = {
  explore: [
    { label: 'Destinations', href: '/destinations' },
    { label: 'Tour Packages', href: '/packages' },
    { label: 'Attractions', href: '/attractions' },
    { label: 'Trending Activities', href: '/trending' },
    { label: 'Group Tours', href: '/group-tours' },
    { label: 'Private Tours', href: '/private-tours' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Media', href: '/media' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Feedback', href: '/feedback' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Terms & Conditions', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cancellation Policy', href: '/cancellation-policy' },
    { label: 'How to Book', href: '/how-to-book' },
    { label: 'Customer Support', href: '/support' },
  ],
};

const socialLinks = [
  {
    name: 'Facebook',
    icon: FaFacebook,
    href: 'https://facebook.com/voyrabali',
    hoverColor: 'hover:text-blue-500'
  },
  {
    name: 'Instagram',
    icon: FaInstagram,
    href: 'https://instagram.com/voyrabali',
    hoverColor: 'hover:text-pink-500'
  },
  {
    name: 'TikTok',
    icon: FaTiktok,
    href: 'https://tiktok.com/@voyrabali',
    hoverColor: 'hover:text-white'
  },
  {
    name: 'YouTube',
    icon: FaYoutube,
    href: 'https://youtube.com/@voyrabali',
    hoverColor: 'hover:text-red-500'
  },
  {
    name: 'Twitter',
    icon: FaTwitter,
    href: 'https://twitter.com/voyrabali',
    hoverColor: 'hover:text-sky-400'
  },
  {
    name: 'Telegram',
    icon: FaTelegramPlane,
    href: 'https://t.me/voyrabali',
    hoverColor: 'hover:text-blue-400'
  },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-zinc-900 text-gray-400 font-sans print:hidden">
      {/* Top Accent Line */}
      <div className="h-1 w-full bg-[#F06400]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* TOP SECTION: 4 COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">

          {/* Column 1: Brand */}
          <div className="space-y-6">
            <Link href="/" aria-label="Home" className="inline-block">
              <div className="text-white">
                <VoryaIcon className="w-32 h-auto" />
              </div>
            </Link>
            <p className="text-sm leading-relaxed">
              Discover Bali's best tours & experiences
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Visit our ${social.name}`}
                    className={`text-gray-400 transition-colors duration-200 ${social.hoverColor}`}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Column 2: Explore */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">
              Explore
            </h3>
            <ul className="space-y-4">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors duration-200 hover:text-white cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">
              Company
            </h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors duration-200 hover:text-white cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Support */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">
              Support
            </h3>
            <ul className="space-y-4">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors duration-200 hover:text-white cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* MIDDLE SECTION: NEWSLETTER */}
        <div className="bg-zinc-800/40 rounded-2xl p-6 lg:p-8 mb-16 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-white font-semibold text-lg mb-1">Stay updated with Bali travel tips</h3>
            <p className="text-sm text-gray-400">Join our newsletter for exclusive offers and hidden gems.</p>
            {message && (
              <p className={`text-sm mt-3 font-semibold ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
          </div>
          <form className="flex w-full md:w-auto gap-2 items-start" onSubmit={handleSubscribe}>
            <div className="flex flex-col w-full h-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                className="bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 text-sm rounded-lg focus:ring-2 focus:ring-[#0071CE] focus:border-transparent block w-full px-4 py-3 outline-none transition-all disabled:opacity-50"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#F06400] hover:bg-orange-600 text-white font-semibold text-sm px-6 py-3 rounded-lg transition-colors duration-200 whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed h-[46px]"
            >
              {loading ? "Please wait..." : "Subscribe"}
            </button>
          </form>
        </div>

        {/* BOTTOM SECTION: VIATOR BADGE, QUICK LINKS & COPYRIGHT */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col items-center gap-6">

          {/* Viator Certification Logo */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <p className="text-sm text-gray-400 font-medium">
              Tours and activities powered by
            </p>
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex items-center justify-center shadow-sm">
              <ViatorIcon className="w-20 h-10 object-contain text-black" />
            </div>
          </div>

          {/* ── Quick Legal & Contact Links ─────────────────────────── */}
          <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-gray-500">
            <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
            <span className="opacity-30">·</span>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
            <span className="opacity-30">·</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
            <span className="opacity-30">·</span>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span className="opacity-30">·</span>
            <Link href="/cancellation-policy" className="hover:text-white transition-colors">Cancellation Policy</Link>
            <span className="opacity-30">·</span>
            <a
              href="https://wa.me/6281234567890?text=Hello%2C+I+would+like+to+inquire+about+booking+a+tour."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-green-400 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          </div>

          {/* Copyright Line */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-medium opacity-60 border-t border-zinc-800 pt-6">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
            </p>
            <p className="text-center md:text-right">
              Made with ❤️ in Bali, Indonesia 🇮🇩
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}