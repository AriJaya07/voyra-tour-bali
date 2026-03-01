import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ReactQueryProvider from "./ReactQueryProvider";
import SessionProviderWrapper from "@/components/Wrapper/SessionProviderWrapper";
import { getServerSession } from "next-auth";
import { authOptions } from "@/utils/common/auth";
import LayoutWrapper from "@/components/Wrapper/LayoutWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voyra Bali Tour",
  description: "Your travel journey starts here",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProviderWrapper session={session}>
          <ReactQueryProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </ReactQueryProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
