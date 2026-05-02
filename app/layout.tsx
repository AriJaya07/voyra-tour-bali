import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getServerSession } from "next-auth";

import "./globals.css";
import { authOptions } from "@/utils/common/auth";
import LayoutWrapper from "@/components/Wrapper/LayoutWrapper";
import AppProviders from "@/components/providers/AppProviders";
import { AnalyticsHead, AnalyticsBody } from "@/components/Global/Analytics";

export { metadata, viewport } from "@/lib/metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0071CE" />
        <link rel="apple-touch-icon" href="/images/icons/apple-touch-icon.png" />
        <AnalyticsHead />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AnalyticsBody />
        <AppProviders session={session}>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AppProviders>
      </body>
    </html>
  );
}
