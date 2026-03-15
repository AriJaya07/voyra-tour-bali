"use client";

import { ReactNode } from "react";

export interface AuthLayoutProps {
  /** Main title above the card */
  title?: string;
  /** Subtitle below the title */
  subtitle?: string;
  /** Optional logo/branding above the title */
  logo?: ReactNode;
  /** Form and any content inside the card */
  children: ReactNode;
  /** Link below the card (e.g. "Sudah punya akun? Masuk disini") */
  footerLink: { text: string; href: string };
  /** Optional extra content below the form (e.g. demo credentials) */
  extraContent?: ReactNode;
}

/**
 * Shared layout for login and register pages.
 * Same background, card style, and structure — only the form content differs.
 */
export default function AuthLayout({
  title,
  subtitle,
  logo,
  children,
  footerLink,
  extraContent,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[url('/images/login/banner-login.png')] bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative overflow-hidden">

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          {logo}
          <h1 className="text-3xl font-black text-white tracking-tight font-sans">
            {title}
          </h1>
          {subtitle && (
            <p className="text-white text-sm mt-1">{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div className="bg-black/50 rounded-3xl shadow-2xl overflow-hidden h-full">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

          <div className="pt-8 px-8">
            {children}
            {extraContent}
          </div>

          {/* Footer link */}
          <div className="text-center my-4">
            <a
              href={footerLink.href}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
            >
              {footerLink.text}
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
