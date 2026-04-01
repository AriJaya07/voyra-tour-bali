import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import SessionProviderWrapper from "@/components/Wrapper/SessionProviderWrapper";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import LayoutWrapper from "@/components/Wrapper/LayoutWrapper";
import { Toaster } from "sonner";
import ExchangeRateProvider from "@/components/providers/ExchangeRateProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXTAUTH_URL || "https://voyra-tour-bali.vercel.app";
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Voyra Bali Tour — Discover Bali's Best Destinations & Packages",
    template: "%s | Voyra Bali Tour",
  },
  description:
    "Explore curated Bali destinations, tour packages, and cultural experiences. Book securely with Voyra Tourism — your trusted travel companion for unforgettable Bali adventures.",
  keywords: [
    "Bali tour",
    "Bali travel",
    "Bali destinations",
    "Bali tour packages",
    "Bali tourism",
    "Voyra Tourism",
    "Nusa Penida tour",
    "Ubud tour",
    "Bali activities",
    "Bali booking",
  ],
  authors: [{ name: "Voyra Tourism" }],
  creator: "Voyra Tourism",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Voyra Bali Tour",
    title: "Voyra Bali Tour — Discover Bali's Best Destinations & Packages",
    description:
      "Explore curated Bali destinations, tour packages, and cultural experiences. Book securely with Voyra Tourism.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Voyra Bali Tour",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voyra Bali Tour — Discover Bali's Best Destinations & Packages",
    description:
      "Explore curated Bali destinations, tour packages, and cultural experiences.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  // JSON-LD structured data for the website
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Voyra Tourism",
    url: SITE_URL,
    description:
      "Curated Bali destinations, tour packages, and cultural experiences.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bali",
      addressCountry: "ID",
    },
    areaServed: {
      "@type": "Place",
      name: "Bali, Indonesia",
    },
    priceRange: "$$",
  };

  return (
    <html lang="en">
      <head>
        {/* Google Analytics 4 */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_title: document.title,
                  send_page_view: true,
                });
              `}
            </Script>
          </>
        )}

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProviderWrapper session={session}>
          <ReactQueryProvider>
            <ExchangeRateProvider />
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </ReactQueryProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: "inherit",
              },
            }}
          />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
