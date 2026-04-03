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
import {
  SITE_URL,
  GA_MEASUREMENT_ID,
  GOOGLE_SITE_VERIFICATION,
  SITE_NAME,
  SITE_TITLE_DEFAULT,
  SITE_TITLE_TEMPLATE,
  SITE_DESCRIPTION,
  SITE_SHORT_DESCRIPTION,
  SITE_KEYWORDS,
  OG_IMAGE,
  OG_IMAGE_ALT,
  OG_IMAGE_WIDTH,
  OG_IMAGE_HEIGHT,
  buildOrganizationJsonLd,
} from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ↑ SITE_URL and GA_MEASUREMENT_ID are imported from @/lib/config

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: SITE_TITLE_TEMPLATE,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_SHORT_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        alt: OG_IMAGE_ALT,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
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
  alternates: {
    canonical: SITE_URL,
  },
  // Google Search Console HTML verification.
  // If the env var is empty, we omit the meta tag so it doesn't generate
  // an invalid verification entry.
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  // JSON-LD structured data — built from global config in @/lib/config
  const jsonLd = buildOrganizationJsonLd();

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
