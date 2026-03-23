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

        {/* BOTTOM SECTION: VIATOR BADGE & COPYRIGHT */}
        <div className="border-t border-zinc-800 pt-8 flex flex-col items-center">

          {/* Viator Certification Logo */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <p className="text-sm text-gray-400 font-medium">
              Tours and activities powered by
            </p>
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-1 flex items-center justify-center shadow-sm">
              <ViatorIcon className="w-20 h-10 object-contain text-black" />
            </div>
          </div>

          {/* Copyright Line */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium opacity-80">
            <p className="text-center md:text-left">
              © {new Date().getFullYear()} Voyra Tourism. All rights reserved.
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